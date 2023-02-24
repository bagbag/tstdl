import type { Observable } from 'rxjs';
import { BehaviorSubject } from 'rxjs';
import { differenceSets } from '../set.js';
import { isDefined } from '../type-guards.js';

export class ArrayBacktracker<T> {
  private readonly recordMap: Map<T, boolean>;
  private readonly recordMapSubject: BehaviorSubject<ReadonlyMap<T, boolean>>;

  private currentValues: Set<T>;

  get record(): ReadonlyMap<T, boolean> {
    return this.recordMap;
  }

  readonly record$: Observable<ReadonlyMap<T, boolean>>;

  constructor(array?: T[]) {
    this.recordMap = new Map();
    this.recordMapSubject = new BehaviorSubject<ReadonlyMap<T, boolean>>(this.recordMap);
    this.currentValues = new Set();
    this.record$ = this.recordMapSubject.asObservable();

    if (isDefined(array)) {
      this.track(array);
    }
  }

  /**
   * gets a clone of the current record
   */
  getRecord(): Map<T, boolean> {
    return new Map(this.recordMap);
  }

  track(array: T[]): void {
    const newValues = new Set(array);

    const added = differenceSets(newValues, this.currentValues);
    const removed = differenceSets(this.currentValues, newValues);

    if ((added.length == 0) && (removed.length == 0)) {
      return;
    }

    for (const value of added) {
      this.recordMap.set(value, true);
    }

    for (const value of removed) {
      this.recordMap.set(value, false);
    }

    this.currentValues = newValues;
    this.recordMapSubject.next(this.recordMap);
  }

  clear(): void {
    this.recordMap.clear();
    this.recordMapSubject.next(this.recordMap);
  }
}
