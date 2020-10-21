import { BehaviorSubject, merge, Subject } from 'rxjs';
import { take } from 'rxjs/operators';
import { ObservableArray } from '../collections/observable';

export class FeedableAsyncIterable<T> implements AsyncIterable<T> {
  private readonly readSubject: Subject<void>;
  private readonly emptySubject: Subject<void>;
  private readonly closedSubject: BehaviorSubject<boolean>;
  private readonly buffer: ObservableArray<{ item: T, error: undefined } | { item: undefined, error: Error }>;

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
    return this.buffer.length;
  }

  constructor() {
    this.readSubject = new Subject();
    this.emptySubject = new Subject();
    this.closedSubject = new BehaviorSubject<boolean>(false);
    this.buffer = new ObservableArray();
  }

  feed(item: T): void {
    if (this.closed) {
      throw new Error('closed');
    }

    this.buffer.add({ item, error: undefined });
  }

  end(): void {
    this.closedSubject.next(true);
  }

  throw(error: Error): void {
    if (this.closed) {
      throw new Error('closed');
    }

    this.buffer.add({ item: undefined, error });
    this.end();
  }

  async *[Symbol.asyncIterator](): AsyncIterableIterator<T> {
    while (!this.closed || this.buffer.length > 0) {
      if (this.buffer.length == 0) {
        await merge(this.closedSubject, this.buffer.add$).pipe(take(1)).toPromise();
      }

      while (this.buffer.length > 0) {
        const entry = this.buffer.removeFirst();

        if (entry.error != undefined) {
          throw entry.error;
        }

        yield entry.item;
        this.readSubject.next();

        if (this.buffer.length == 0) {
          this.emptySubject.next();
        }
      }
    }
  }
}
