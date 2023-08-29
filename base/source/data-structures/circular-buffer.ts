import type { CancellationSignal } from '#/cancellation/token.js';
import { CancellationToken } from '#/cancellation/token.js';
import { isArray, isDefined, isUndefined } from '#/utils/type-guards.js';
import type { Observable } from 'rxjs';
import { BehaviorSubject, Subject, distinctUntilChanged, filter, first, firstValueFrom, from, map, race } from 'rxjs';
import { Collection } from './collection.js';

export class CircularBuffer<T> extends Collection<T, CircularBuffer<T>> {
  private readonly maxBufferSizeSubject: BehaviorSubject<number | undefined>;
  private readonly overflowSubject: Subject<T>;

  private backingArray: (T | undefined)[];
  private writeIndex: number;
  private readIndex: number;

  /** emits overwritten items */
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

    this.onFull$ = this.isFull$.pipe(filter((isFull) => isFull), map(() => undefined));
    this.onFreeSlots$ = this.hasFreeSlots$.pipe(filter((hasFreeSlots) => hasFreeSlots), map(() => undefined));

    this.clear();
  }

  includes(item: T): boolean {
    for (const entry of this) {
      if (entry === item) {
        return true;
      }
    }

    return false;
  }

  add(item: T): void {
    this.increaseBufferSizeIfNeeded();

    const overwrite = this.isFull;
    const overwrittenItem = overwrite ? this.backingArray[this.writeIndex]! : undefined;

    this.backingArray[this.writeIndex] = item;
    this.writeIndex = (this.writeIndex + 1) % this.bufferSize;

    if (overwrite) {
      this.readIndex = (this.readIndex + 1) % this.bufferSize;
      this.overflowSubject.next(overwrittenItem!);
      this.emitChange();
      return;
    }

    this.incrementSize();
  }

  addMany(items: Iterable<T>): void {
    const increase = isArray(items) ? items.length : (items instanceof Collection) ? items.size : 1;
    this.increaseBufferSizeIfNeeded(this.size + increase);

    for (const item of items) {
      this.add(item);
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

    const item = this.backingArray[this.readIndex]!;

    this.backingArray[this.readIndex] = undefined;
    this.readIndex = (this.readIndex + 1) % this.bufferSize;
    this.decrementSize();

    return item;
  }

  clone(newMaxBufferSize: number | undefined = this.maxBufferSize): CircularBuffer<T> {
    if (isDefined(newMaxBufferSize) && (newMaxBufferSize < this.size)) {
      throw new Error('newSize must be equal or larger to current size.');
    }

    const cloned = new CircularBuffer<T>(newMaxBufferSize);
    cloned.addMany(this);

    return cloned;
  }

  *items(): IterableIterator<T> {
    const size = this.size;
    let readIndex = this.readIndex;
    let modified = false;

    const subscription = from(this.change$).pipe(first()).subscribe(() => (modified = true));

    try {
      for (let i = 0; i < size; i++) {
        if (modified) { // eslint-disable-line @typescript-eslint/no-unnecessary-condition
          throw new Error('Buffer was modified while being iterated.');
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
   * @param cancellationSignal token to cancel iteration
   * @param yieldOutstandingItems whether to yield all outstanding items or exit immdiately when {@link cancellationSignal} is set
   * @returns
   */
  async *consumeAsync(cancellationSignal: CancellationSignal = new CancellationToken(), yieldOutstandingItems: boolean = true): AsyncIterable<T> {
    while (true) {
      if (this.isEmpty) {
        await firstValueFrom(race([this.onItems$, cancellationSignal]));
      }

      while ((this.size > 0) && (cancellationSignal.isUnset || yieldOutstandingItems)) { // eslint-disable-line no-unmodified-loop-condition
        yield this.tryRemove()!;
      }

      if (cancellationSignal.isSet) {
        return;
      }
    }
  }

  protected _clear(): void {
    this.backingArray = [];
    this.backingArray.length = 2;
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
      throw new Error('Buffer has more items than it would have capacity after resize.');
    }

    let newBackingArray: (T | undefined)[];

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
    else {
      newBackingArray = [];
    }

    newBackingArray.length = size;

    this.backingArray = newBackingArray;
    this.writeIndex = this.size % this.backingArray.length;
    this.readIndex = 0;

    this.emitChange();
  }
}
