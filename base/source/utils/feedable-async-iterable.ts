import { CircularBuffer } from '#/data-structures';
import { firstValueFrom } from '#/rxjs/compat';
import { Subject } from 'rxjs';
import { CancellationToken } from './cancellation-token';

export class FeedableAsyncIterable<T> implements AsyncIterable<T> {
  private readonly readSubject: Subject<void>;
  private readonly closedToken: CancellationToken;
  private readonly buffer: CircularBuffer<{ item: T, error: undefined } | { item: undefined, error: Error }>;

  get $read(): Promise<void> {
    return firstValueFrom(this.readSubject);
  }

  get $empty(): Promise<void> {
    return this.buffer.$onEmpty;
  }

  get closed(): boolean {
    return this.closedToken.isSet;
  }

  get bufferSize(): number {
    return this.buffer.size;
  }

  constructor() {
    this.readSubject = new Subject();
    this.closedToken = new CancellationToken();
    this.buffer = new CircularBuffer();
  }

  feed(item: T): void {
    if (this.closed) {
      throw new Error('closed');
    }

    this.buffer.add({ item, error: undefined });
  }

  end(): void {
    this.closedToken.set();
  }

  throw(error: Error): void {
    if (this.closed) {
      throw new Error('closed');
    }

    this.buffer.add({ item: undefined, error });
    this.end();
  }

  async *[Symbol.asyncIterator](): AsyncIterableIterator<T> {
    const consumer = this.buffer.consumeAsync(this.closedToken, true);

    for await (const entry of consumer) {
      if (entry.error != undefined) {
        throw entry.error;
      }

      yield entry.item;
      this.readSubject.next();
    }
  }
}
