import type { Observable } from 'rxjs';
import { BehaviorSubject } from 'rxjs';
import { filter, mapTo, take } from 'rxjs/operators';

export class ObservableSet<T> implements Set<T> {
  private readonly backingSet: Set<T>;
  private readonly subject: BehaviorSubject<ObservableSet<T>>;

  readonly [Symbol.toStringTag] = ObservableSet.name;

  get observe$(): Observable<ObservableSet<T>> {
    return this.subject.asObservable();
  }

  get size(): number {
    return this.backingSet.size;
  }

  get $observe(): Promise<void> {
    return this.subject.pipe(take(1), mapTo(undefined)).toPromise();
  }

  get $empty(): Promise<void> {
    return this.observe$.pipe(
      filter(() => this.size == 0),
      take(1),
      mapTo(undefined)
    ).toPromise();
  }

  constructor() {
    this.backingSet = new Set();
    this.subject = new BehaviorSubject(this as ObservableSet<T>);
  }

  add(value: T): this {
    this.backingSet.add(value);
    this.next();

    return this;
  }

  clear(): void {
    this.backingSet.clear();
    this.next();
  }

  delete(value: T): boolean {
    const success = this.backingSet.delete(value);

    if (success) {
      this.next();
    }

    return success;
  }

  forEach(callbackfn: (value: T, value2: T, set: Set<T>) => void, thisArg?: any): void {
    this.backingSet.forEach(callbackfn, thisArg);
  }

  has(value: T): boolean {
    return this.backingSet.has(value);
  }

  entries(): IterableIterator<[T, T]> {
    return this.backingSet.entries();
  }

  keys(): IterableIterator<T> {
    return this.backingSet.keys();
  }

  values(): IterableIterator<T> {
    return this.backingSet.values();
  }

  [Symbol.iterator](): IterableIterator<T> {
    return this.backingSet[Symbol.iterator]();
  }

  private next(): void {
    this.subject.next(this);
  }
}
