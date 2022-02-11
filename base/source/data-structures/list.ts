import type { Predicate } from '#/utils/iterable-helpers';
import { isDefined } from '#/utils/type-guards';
import { Collection } from './collection';
import { IndexOutOfBoundsError } from './index-out-of-bounds.error';

export abstract class List<T, TThis extends Collection<T, TThis>> extends Collection<T, TThis> {
  protected ensureBounds(index: number, count?: number): void {
    if ((index < 0) || (index > (this.size - 1))) {
      throw new IndexOutOfBoundsError(index, this.size);
    }

    if (isDefined(count)) {
      const endIndex = index + (count - 1);

      if ((endIndex < 0) || (endIndex > (this.size - 1))) {
        throw new IndexOutOfBoundsError(endIndex, this.size);
      }
    }
  }

  /** get item at index */
  abstract at(index: number): T;

  /**
   * find index of first occurrence of item
   * @param item item to search for
   * @param fromIndex index to start search at
   */
  abstract indexOf(item: T, fromIndex?: number): number | undefined;

  /** index of match (first occurrence) */
  abstract findIndex(predicate: Predicate<T>): number | undefined;

  /** index of item (last occurrence) */
  /**
   * find index of last occurrence of item
   * @param item item to search for
   * @param fromIndex index to start from (backwards)
   */
  abstract lastIndexOf(item: T, fromIndex?: number): number | undefined;

  /** index of match (last occurrence) */
  abstract findLastIndex(predicate: Predicate<T>): number | undefined;

  /** set item at index */
  abstract set(index: number, item: T): void;

  /** add item to start of list */
  abstract prepend(item: T): void;

  /** add many items to start of list */
  abstract prependMany(items: Iterable<T>): void;

  /** remove item */
  abstract remove(item: T): boolean;

  /** remove item at index */
  abstract removeAt(index: number): T;

  /**
   * remove many items at index
   * @param index index to start removing at
   * @param count how many items to remove. If not defined, all items starting at `index` are removed
   */
  abstract removeManyAt(index: number, count?: number): T[];

  /** yields all items from the list in reverse */
  abstract itemsReverse(): IterableIterator<T>;
}
