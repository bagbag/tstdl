import { BehaviorSubject, merge, Subject } from 'rxjs';
import { take } from 'rxjs/operators';
import { AwaitableList } from '../collections/awaitable';

export class FeedableAsyncIterable<T> implements AsyncIterable<T> {
  private readonly readSubject: Subject<void>;
  private readonly emptySubject: Subject<void>;
  private readonly closedSubject: BehaviorSubject<boolean>;
  private buffer: AwaitableList<{ item: T, error: undefined } | { item: undefined, error: Error }>;

  get $read(): Promise<void> {
    return this.readSubject.pipe(take(1)).toPromise();
  }

  get $empty(): Promise<void> {
    return this.emptySubject.pipe(take(1)).toPromise();
  }

  get closed(): boolean {
    return this.closedSubject.value;
  }

  get bufferSize(): number {
    return this.buffer.size;
  }

  constructor() {
    this.readSubject = new Subject();
    this.emptySubject = new Subject();
    this.closedSubject = new BehaviorSubject<boolean>(false);
    this.buffer = new AwaitableList();
  }

  feed(item: T): void {
    if (this.closed) {
      throw new Error('closed');
    }

    this.buffer.append({ item, error: undefined });
  }

  end(): void {
    this.closedSubject.next(true);
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
        await merge(this.closedSubject, this.buffer.added).pipe(take(1)).toPromise();
      }

      const out = this.buffer;
      this.buffer = new AwaitableList();

      for (const entry of out) {
        if (entry.error != undefined) {
          throw entry.error;
        }

        yield entry.item;
        this.readSubject.next();

        if (this.buffer.size == 0) {
          this.emptySubject.next();
        }
      }
    }
  }
}
