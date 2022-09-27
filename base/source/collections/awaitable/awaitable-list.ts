import { firstValueFrom } from '#/rxjs/compat';
import type { Observable } from 'rxjs';
import { Subject } from 'rxjs';

export class AwaitableList<T> implements Iterable<T> {
  private readonly _added: Subject<T | T[]>;
  private readonly _removed: Subject<T | T[]>;
  private readonly _cleared: Subject<void>;

  private backingArray: T[];

  get added$(): Observable<T | T[]> {
    return this._added.asObservable();
  }

  get removed$(): Observable<T | T[]> {
    return this._removed.asObservable();
  }

  get cleared$(): Observable<void> {
    return this._cleared.asObservable();
  }

  get $added(): Promise<T | T[]> {
    return firstValueFrom(this._added);
  }

  get $removed(): Promise<T | T[]> {
    return firstValueFrom(this._removed);
  }

  get $cleared(): Promise<void> {
    return firstValueFrom(this._cleared);
  }

  get size(): number {
    return this.backingArray.length;
  }

  constructor() {
    this.backingArray = [];

    this._added = new Subject();
    this._removed = new Subject();
    this._cleared = new Subject();
  }

  get(index: number): T {
    if (index >= this.size || index < 0) {
      throw new Error('Index out of bounds.');
    }

    return this.backingArray[index]!;
  }

  set(index: number, value: T): void {
    if (index >= this.size || index < 0) {
      throw new Error('Index out of bounds.');
    }

    const oldValue = this.backingArray[index]!;
    this.backingArray[index] = value;

    this._removed.next(oldValue);
    this._added.next(value);
  }

  append(...items: T[]): number {
    const result = this.backingArray.push(...items);
    this._added.next(items);

    return result;
  }

  prepend(...items: T[]): number {
    const result = this.backingArray.unshift(...items);
    this._added.next(items);

    return result;
  }

  insert(index: number, ...items: T[]): void {
    if (index >= this.size || index < 0) {
      throw new Error('Index out of bounds.');
    }

    this.backingArray.splice(index, 0, ...items);
    this._added.next(items);
  }

  remove(index: number, count: number = 1): T[] {
    if (index >= this.size || index < 0) {
      throw new Error('Index out of bounds.');
    }

    if ((index + count) > this.size) {
      throw new Error('Count out of bounds.');
    }

    const removedItems = this.backingArray.splice(index, count);
    this._removed.next(removedItems);

    return removedItems;
  }

  pop(): T {
    if (this.size == 0) {
      throw new Error('List contains no items.');
    }

    const result = this.backingArray.pop()!;
    this._removed.next(result);

    return result;
  }

  shift(): T {
    if (this.size == 0) {
      throw new Error('List contains no items.');
    }

    const result = this.backingArray.shift()!;
    this._removed.next(result);

    return result;
  }

  clear(): void {
    this.backingArray = [];
    this._cleared.next();
  }

  *[Symbol.iterator](): IterableIterator<T> {
    yield* this.backingArray[Symbol.iterator]();
  }
}
