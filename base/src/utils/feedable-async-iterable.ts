import { DeferredPromise } from '../promise/deferred-promise';
import { AwaitableList } from './collections/awaitable';
import { CancellationToken } from './cancellation-token';

export class FeedableAsyncIterable<T> implements AsyncIterable<T> {
  private readonly _read: DeferredPromise;
  private readonly _empty: DeferredPromise;
  private readonly _closed: CancellationToken;
  private buffer: AwaitableList<{ item: T, error: undefined } | { item: undefined, error: Error }>;

  get read(): Promise<void> {
    return this._read;
  }

  get empty(): Promise<void> {
    return this._empty;
  }

  get closed(): boolean {
    return this._closed.isSet;
  }

  get bufferSize(): number {
    return this.buffer.size;
  }

  constructor() {
    this._closed = new CancellationToken();
    this.buffer = new AwaitableList();
    this._read = new DeferredPromise();
    this._empty = new DeferredPromise();
  }

  feed(item: T): void {
    if (this.closed) {
      throw new Error('closed');
    }

    this.buffer.append({ item, error: undefined });
  }

  end(): void {
    this._closed.set();
  }

  throw(error: Error): void {
    if (this.closed) {
      throw new Error('closed');
    }

    this.buffer.append({ item: undefined, error });
    this.end();
  }

  async *[Symbol.asyncIterator](): AsyncIterableIterator<T> {
    while (!this.closed || this.buffer.size > 0) {
      if (this.buffer.size == 0) {
        await Promise.race([this._closed, this.buffer.added]);
      }

      const out = this.buffer;
      this.buffer = new AwaitableList();

      for (const entry of out) {
        if (entry.error != undefined) {
          throw entry.error;
        }

        yield entry.item;
        this._read.resolveAndReset();

        if (this.buffer.size == 0) {
          this._empty.resolveAndReset();
        }
      }
    }
  }
}
