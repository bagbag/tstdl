import { firstValueFrom } from '#/rxjs/compat';
import type { ReadonlyCancellationToken } from '#/utils/cancellation-token';
import { CancellationToken } from '#/utils/cancellation-token';
import { isArray, isDefined, isUndefined } from '#/utils/type-guards';
import type { Observable } from 'rxjs';
import { BehaviorSubject, distinctUntilChanged, filter, first, from, map, mapTo, race, Subject } from 'rxjs';
import { Collection } from './collection';

export class CircularBuffer<T> extends Collection<T, CircularBuffer<T>> {
  private readonly maxBufferSizeSubject: BehaviorSubject<number | undefined>;
  private readonly overflowSubject: Subject<T>;

  private backingArray: (T | undefined)[];
  private writeIndex: number;
  private readIndex: number;

  /** emits overwritten values */
  readonly overflow$: Observable<T>;

  /** emits count of free slots in the buffer */
  readonly freeSlots$: Observable<number>;

  /** emits when the buffer is full */
  readonly onFull$: Observable<void>;

  /** emits when the buffer has free slots */
  readonly onFreeSlots$: Observable<void>;

  /** emits whether the buffer is full */
  readonly isFull$: Observable<boolean>;

  /** emits whether the buffer has free slots */
  readonly hasFreeSlots$: Observable<boolean>;

  /** resolves when the buffer is full */
  get $onFull(): Promise<void> {
    return firstValueFrom(this.onFull$);
  }

  /** resolves when the buffer has items */
  get $onFreeSlots(): Promise<void> {
    return firstValueFrom(this.onFreeSlots$);
  }

  /** size of buffer */
  get bufferSize(): number {
    return this.backingArray.length;
  }

  /** size of buffer */
  get maxBufferSize(): number {
    return this.maxBufferSizeSubject.value ?? Infinity;
  }

  /** count of free slots in buffer */
  get freeSlots(): number {
    if (isUndefined(this.maxBufferSize)) {
      return Infinity;
    }

    return this.bufferSize - this.size;
  }

  /** whether the buffer is full */
  get isFull(): boolean {
    return this.freeSlots == 0;
  }

  /** whether the buffer has free slots */
  get hasFreeSlots(): boolean {
    return this.freeSlots > 0;
  }

  constructor(maxBufferSize?: number) {
    super();

    this.maxBufferSizeSubject = new BehaviorSubject<number | undefined>(maxBufferSize);
    this.overflowSubject = new Subject();

    this.overflow$ = this.overflowSubject.asObservable();
    this.freeSlots$ = this.change$.pipe(map(() => this.freeSlots));

    this.isFull$ = this.change$.pipe(map(() => this.isFull), distinctUntilChanged());
    this.hasFreeSlots$ = this.change$.pipe(map(() => this.hasFreeSlots), distinctUntilChanged());

    this.onFull$ = this.isFull$.pipe(filter((isFull) => isFull), mapTo(undefined));
    this.onFreeSlots$ = this.hasFreeSlots$.pipe(filter((hasFreeSlots) => hasFreeSlots), mapTo(undefined));

    this.clear();
  }

  add(value: T): void {
    this.increaseBufferSizeIfNeeded();

    const overwrite = this.isFull;
    const overwrittenValue = overwrite ? this.backingArray[this.writeIndex]! : undefined;

    this.backingArray[this.writeIndex] = value;
    this.writeIndex = (this.writeIndex + 1) % this.bufferSize;

    if (overwrite) {
      this.readIndex = (this.readIndex + 1) % this.bufferSize;
      this.overflowSubject.next(overwrittenValue!);
      this.emitChange();
      return;
    }

    this.incrementSize();
  }

  addMany(values: Iterable<T>): void {
    const increase = isArray(values) ? values.length : (values instanceof Collection) ? values.size : 1;
    this.increaseBufferSizeIfNeeded(this.size + increase);

    for (const value of values) {
      this.add(value);
    }
  }

  remove(): T {
    if (this.size == 0) {
      throw new Error('buffer is empty');
    }

    return this.tryRemove()!;
  }

  tryRemove(): T | undefined {
    if (this.size == 0) {
      return undefined;
    }

    const value = this.backingArray[this.readIndex]!;
    this.backingArray[this.readIndex] = undefined;
    this.readIndex = (this.readIndex + 1) % this.bufferSize;
    this.decrementSize();

    return value;
  }

  clone(newMaxBufferSize: number | undefined = this.maxBufferSize): CircularBuffer<T> {
    if (isDefined(newMaxBufferSize) && (newMaxBufferSize < this.size)) {
      throw new Error('newSize must be equal or larger to current size');
    }

    const cloned = new CircularBuffer<T>(newMaxBufferSize);
    cloned.addMany(this);

    return cloned;
  }

  *[Symbol.iterator](): IterableIterator<T> {
    const size = this.size;
    let readIndex = this.readIndex;
    let modified = false;

    const subscription = from(this.change$).pipe(first()).subscribe(() => (modified = true));

    try {
      for (let i = 0; i < size; i++) {
        if (modified) {
          throw new Error('buffer was modified while being iterated');
        }

        yield this.backingArray[readIndex]!;
        readIndex = (readIndex + 1) % this.bufferSize;
      }
    }
    finally {
      subscription.unsubscribe();
    }
  }

  /** yields all items from the buffer and removes them */
  *consume(): IterableIterator<T> {
    while (this.size > 0) {
      yield this.tryRemove()!;
    }
  }

  /**
   * yields all items from the buffer, removes them and waits fore more
   * @param cancellationToken token to cancel iteration
   * @param yieldOutstandingItems whether to yield all outstanding items or exit immdiately
   * @returns
   */
  async *consumeAsync(cancellationToken: ReadonlyCancellationToken = new CancellationToken(), yieldOutstandingItems: boolean = true): AsyncIterable<T> {
    while (true) {
      if (this.isEmpty) {
        await firstValueFrom(race([this.onItems$, cancellationToken]));
      }

      while ((this.size > 0) && (cancellationToken.isUnset || yieldOutstandingItems)) {
        yield this.tryRemove()!;
      }

      if (cancellationToken.isSet) {
        return;
      }
    }
  }

  protected _clear(): void {
    this.backingArray = new Array(2);
    this.writeIndex = 0;
    this.readIndex = 0;
  }

  private increaseBufferSizeIfNeeded(requiredCapacity: number = this.size + 1): void {
    if (requiredCapacity <= this.bufferSize) {
      return;
    }

    const newSize = Math.min(2 ** Math.ceil(Math.log2(requiredCapacity)), this.maxBufferSize);

    if (newSize != this.bufferSize) {
      this.resize(newSize);
    }
  }

  private resize(size: number): void {
    if (size < this.size) {
      throw new Error('buffer has more items than it would have capacity after resize');
    }

    let newBackingArray: (T | undefined)[] = [];

    if (this.size > 0) {
      if (this.readIndex < this.writeIndex) {
        newBackingArray = this.backingArray.slice(this.readIndex, this.writeIndex);
      }
      else {
        const start = this.backingArray.slice(this.readIndex);
        const end = this.backingArray.slice(0, this.writeIndex);
        newBackingArray = start.concat(end);
      }
    }

    newBackingArray.length = size;

    this.backingArray = newBackingArray;
    this.writeIndex = this.size % this.backingArray.length;
    this.readIndex = 0;

    this.emitChange();
  }
}
