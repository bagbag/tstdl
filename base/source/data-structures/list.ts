import type { Predicate } from '#/utils/iterable-helpers/types.js';
import { isDefined } from '#/utils/type-guards.js';
import { Collection } from './collection.js';
import { IndexOutOfBoundsError } from './index-out-of-bounds.error.js';

export abstract class List<T, TThis extends Collection<T, TThis>> extends Collection<T, TThis> {
  /** get item at index */
  at(index: number): T {
    const normalizedIndex = this.normalizeIndex(index);
    this.ensureBounds(normalizedIndex);

    return this._at(normalizedIndex);
  }

  /**
   * find index of first occurrence of item
   * @param item item to search for
   * @param fromIndex index to start search at
   */
  indexOf(item: T, fromIndex?: number): number | undefined {
    return this._indexOf(item, isDefined(fromIndex) ? this.normalizeIndex(fromIndex) : fromIndex);
  }

  /** index of item (last occurrence) */
  /**
   * find index of last occurrence of item
   * @param item item to search for
   * @param fromIndex index to start from (backwards)
   */
  lastIndexOf(item: T, fromIndex?: number): number | undefined {
    return this._lastIndexOf(item, isDefined(fromIndex) ? this.normalizeIndex(fromIndex) : fromIndex);
  }

  /** set item at index */
  set(index: number, item: T): void {
    const normalizedIndex = this.normalizeIndex(index);
    this.ensureBounds(normalizedIndex);

    this._set(normalizedIndex, item);
  }

  /** remove item at index */
  removeAt(index: number): T {
    const normalizedIndex = this.normalizeIndex(index);
    this.ensureBounds(normalizedIndex);

    return this._removeAt(normalizedIndex);
  }

  /** remove first item */
  removeFirst(): T {
    return this.removeAt(0);
  }

  /** remove last item */
  removeLast(): T {
    return this.removeAt(-1);
  }

  /**
   * remove many items at index
   * @param index index to start removing at
   * @param count how many items to remove. If not defined, all items starting at `index` are removed
   */
  removeManyAt(index: number, count: number = this.size - index): T[] {
    const normalizedIndex = this.normalizeIndex(index);
    this.ensureBounds(normalizedIndex, count);

    return this._removeManyAt(normalizedIndex, count);
  }

  /**
   * remove range of items at `fromIndex` to `toIndex`
   * @param fromIndex index to start removing at
   * @param toIndex index to remove to
   */
  removeRange(fromIndex: number, toIndex: number): T[] {
    const from = this.normalizeIndex(fromIndex);
    const to = this.normalizeIndex(toIndex);

    const count = 1 + (to - from);

    if (count < 1) {
      throw new Error('toIndex can\'t be less than fromIndex');
    }

    return this._removeManyAt(from, count);
  }

  protected ensureBounds(index: number, count?: number): void {
    if ((index < 0) || (index > (this.size - 1))) {
      throw new IndexOutOfBoundsError({ index, count, size: this.size });
    }

    if (isDefined(count) && (count < 0)) {
      throw new Error('count can\'t be negative');
    }

    if (isDefined(count)) {
      const endIndex = index + (count - 1);

      if ((endIndex < 0) || (endIndex > (this.size - 1))) {
        throw new IndexOutOfBoundsError({ index, count, size: this.size });
      }
    }
  }

  protected normalizeIndex(index: number): number {
    if (index < 0) {
      return this.size + index;
    }

    return index;
  }

  /** yields all items from the list in reverse */
  abstract itemsReverse(): IterableIterator<T>;

  /** get item at index */
  protected abstract _at(index: number): T;

  /**
   * find index of first occurrence of item
   * @param item item to search for
   * @param fromIndex index to start search at
   */
  protected abstract _indexOf(item: T, fromIndex?: number): number | undefined;

  /** index of match (first occurrence) */
  protected abstract findIndex(predicate: Predicate<T>): number | undefined;

  /** index of item (last occurrence) */
  /**
   * find index of last occurrence of item
   * @param item item to search for
   * @param fromIndex index to start from (backwards)
   */
  protected abstract _lastIndexOf(item: T, fromIndex?: number): number | undefined;

  /** index of match (last occurrence) */
  protected abstract findLastIndex(predicate: Predicate<T>): number | undefined;

  /** set item at index */
  protected abstract _set(index: number, item: T): void;

  /** add item to start of list */
  protected abstract prepend(item: T): void;

  /** add many items to start of list */
  protected abstract prependMany(items: Iterable<T>): void;

  /** remove item */
  protected abstract remove(item: T): boolean;

  /** remove item at index */
  protected abstract _removeAt(index: number): T;

  /**
   * remove many items at index
   * @param index index to start removing at
   * @param count how many items to remove. If not defined, all items starting at `index` are removed
   */
  protected abstract _removeManyAt(index: number, count?: number): T[];
}
