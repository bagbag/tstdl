import { firstValueFrom } from '#/rxjs/compat';
import type { ReadonlyCancellationToken } from '#/utils';
import { createArray } from '#/utils/array';
import type { Observable } from 'rxjs';
import { BehaviorSubject, distinctUntilChanged, filter, map, mapTo, NEVER, race, Subject } from 'rxjs';

export class CircularBuffer<T> implements Iterable<T>, AsyncIterable<T> {
  private readonly bufferSize: number;
  private readonly overflowSubject: Subject<T>;
  private readonly bufferedCountSubject: BehaviorSubject<number>;

  private backingArray: (T | undefined)[];
  private writeIndex: number;
  private readIndex: number;

  /** emits overwritten values */
  readonly overflow$: Observable<T>;

  /** emits count of buffered items */
  readonly bufferedCount$: Observable<number>;

  /** emits count of free slots in the buffer */
  readonly freeSlotsCount$: Observable<number>;

  /** emits when the buffer is empty */
  readonly empty$: Observable<void>;

  /** emits when the buffer is full */
  readonly full$: Observable<void>;

  /** emits when the buffer has items */
  readonly buffered$: Observable<void>;

  /** emits when the buffer has free slots */
  readonly freeSlots$: Observable<void>;

  /** emits whether the buffer is empty */
  readonly isEmpty$: Observable<boolean>;

  /** emits whether the buffer is full */
  readonly isFull$: Observable<boolean>;

  /** emits whether the buffer has items */
  readonly hasBuffered$: Observable<boolean>;

  /** emits whether the buffer has free slots */
  readonly hasFreeSlots$: Observable<boolean>;

  /** resolves when the buffer is empty */
  get $empty(): Promise<void> {
    return firstValueFrom(this.empty$);
  }

  /** resolves when the buffer is full */
  get $full(): Promise<void> {
    return firstValueFrom(this.full$);
  }

  /** resolves when the buffer has items */
  get $buffered(): Promise<void> {
    return firstValueFrom(this.buffered$);
  }

  /** resolves when the buffer has items */
  get $freeSlots(): Promise<void> {
    return firstValueFrom(this.freeSlots$);
  }

  /** size of buffer */
  get size(): number {
    return this.bufferSize;
  }

  /** count of buffered items */
  get bufferedCount(): number {
    return this.bufferedCountSubject.value;
  }

  /** count of free slots in buffer */
  get freeSlotsCount(): number {
    return this.bufferSize - this.bufferedCount;
  }

  /** whether the buffer is empty */
  get isEmpty(): boolean {
    return this.bufferedCount == 0;
  }

  /** whether the buffer is full */
  get isFull(): boolean {
    return this.bufferedCount == this.bufferSize;
  }

  /** whether the buffer has items */
  get hasBuffered(): boolean {
    return this.bufferedCount > 0;
  }

  /** whether the buffer has free slots */
  get hasFreeSlots(): boolean {
    return this.bufferedCount < this.bufferSize;
  }

  constructor(bufferSize: number) {
    this.bufferSize = bufferSize;

    this.overflowSubject = new Subject();
    this.bufferedCountSubject = new BehaviorSubject<number>(0);

    const distinctBufferedCount$ = this.bufferedCountSubject.pipe(distinctUntilChanged());

    this.overflow$ = this.overflowSubject.asObservable();
    this.bufferedCount$ = distinctBufferedCount$;
    this.freeSlotsCount$ = distinctBufferedCount$.pipe(map((count) => bufferSize - count));

    this.isEmpty$ = distinctBufferedCount$.pipe(map((buffered) => buffered == 0), distinctUntilChanged());
    this.isFull$ = distinctBufferedCount$.pipe(map((buffered) => buffered == bufferSize), distinctUntilChanged());
    this.hasBuffered$ = distinctBufferedCount$.pipe(map((buffered) => buffered > 0), distinctUntilChanged());
    this.hasFreeSlots$ = distinctBufferedCount$.pipe(map((buffered) => buffered < bufferSize), distinctUntilChanged());

    this.empty$ = this.isEmpty$.pipe(filter((isEmpty) => isEmpty), mapTo(undefined));
    this.full$ = this.isFull$.pipe(filter((isFull) => isFull), mapTo(undefined));
    this.buffered$ = this.hasBuffered$.pipe(filter((hasBuffered) => hasBuffered), mapTo(undefined));
    this.freeSlots$ = this.hasFreeSlots$.pipe(filter((hasFreeSlots) => hasFreeSlots), mapTo(undefined));

    this.clear();
  }

  add(value: T): void {
    const overwrite = this.isFull;
    const overwrittenValue = this.backingArray[this.writeIndex]!;

    this.backingArray[this.writeIndex] = value;
    this.writeIndex = (this.writeIndex + 1) % this.backingArray.length;

    if (overwrite) {
      this.readIndex = (this.readIndex + 1) % this.bufferSize;
      this.overflowSubject.next(overwrittenValue);
      return;
    }

    this.bufferedCountSubject.next(this.bufferedCount + 1);
  }

  addMany(values: T[]): void {
    for (const value of values) {
      this.add(value);
    }
  }

  remove(): T {
    if (this.bufferedCount == 0) {
      throw new Error('buffer is empty');
    }

    return this.tryRemove()!;
  }

  tryRemove(): T | undefined {
    if (this.bufferedCount == 0) {
      return undefined;
    }

    const value = this.backingArray[this.readIndex]!;
    this.backingArray[this.readIndex] = undefined;
    this.readIndex = (this.readIndex + 1) % this.bufferSize;
    this.bufferedCountSubject.next(this.bufferedCount - 1);

    return value;
  }

  clear(): void {
    this.backingArray = createArray(this.bufferSize, () => undefined);
    this.writeIndex = 0;
    this.readIndex = 0;
    this.bufferedCountSubject.next(0);
  }

  /** yields all items from the buffer and removes them */
  *[Symbol.iterator](): IterableIterator<T> {
    while (this.bufferedCount > 0) {
      yield this.remove();
    }
  }

  /** yields all items from the buffer, removes them and waits fore more */
  async *[Symbol.asyncIterator](cancellationToken?: ReadonlyCancellationToken): AsyncIterator<T> {
    const cancel$ = cancellationToken ?? NEVER;

    while (true) {
      if (this.isEmpty) {
        await firstValueFrom(race([this.buffered$, cancel$]));
      }

      if (cancellationToken?.isSet == true) {
        return;
      }

      while (this.bufferedCount > 0) {
        yield this.remove();
      }
    }
  }
}
