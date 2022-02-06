import { FeedableAsyncIterable } from './feedable-async-iterable';

export class OrderedFeedableAsyncIterable<T> implements Omit<FeedableAsyncIterable<T>, 'feed'> {
  private readonly inBuffer: Map<number, T>;
  private readonly out: FeedableAsyncIterable<T>;

  private currentIndex: number = 0;

  get $read(): Promise<void> {
    return this.out.$read;
  }

  get $empty(): Promise<void> {
    return this.out.$empty;
  }

  get closed(): boolean {
    return this.out.closed;
  }

  get bufferSize(): number {
    return this.out.bufferSize;
  }

  constructor() {
    this.inBuffer = new Map<number, T>();
    this.out = new FeedableAsyncIterable<T>();
  }

  feed(item: T, index: number): void {
    if (this.out.closed) {
      throw new Error('feedable is already closed');
    }

    this.inBuffer.set(index, item);

    this.dispatch();
  }

  end(): void {
    this.out.end();
  }

  throw(error: Error): void {
    this.out.throw(error);
  }

  [Symbol.asyncIterator](): AsyncIterableIterator<T> {
    return this.out[Symbol.asyncIterator]();
  }

  private dispatch(): void {
    while (this.inBuffer.has(this.currentIndex)) {
      const item = this.inBuffer.get(this.currentIndex)!;

      this.inBuffer.delete(this.currentIndex++);
      this.out.feed(item);
    }
  }
}
