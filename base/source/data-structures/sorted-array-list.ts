/* eslint-disable @typescript-eslint/member-ordering */
import { NotImplementedError } from '#/error/not-implemented.error.js';
import type { TryDereference } from '#/serializer/serializable.js';
import { Serializable, serializable } from '#/serializer/serializable.js';
import { binarySearch, binarySearchFirst, binarySearchInsertionIndex, binarySearchLast } from '#/utils/binary-search.js';
import { compareByValue } from '#/utils/comparison.js';
import type { Predicate } from '#/utils/iterable-helpers/types.js';
import type { Comparator } from '#/utils/sort.js';
import { isDefined, isUndefined } from '#/utils/type-guards.js';
import { List } from './list.js';

export type RangeType = 'inclusive' | 'exclusive';

@serializable('SortedArrayList')
export class SortedArrayList<T extends TComparator, TComparator = T> extends List<T, SortedArrayList<T, TComparator>> implements Serializable<SortedArrayList<T, TComparator>, T[]> {
  private readonly comparator: Comparator<TComparator>;

  private backingArray: T[];

  constructor(items: Iterable<T> = [], comparator: Comparator<TComparator> = compareByValue) {
    super();

    this.comparator = comparator;
    this.backingArray = [...items].sort(comparator);
    this.updateSize();
  }

  /**
   * creates a new {@link SortedArrayList} from existing *sorted* array without copying data.
   * If an unsorted array is provided, behaviour is undefined
   * @param array array to use as new backing array for this {@link SortedArrayList}
   */
  static fromSortedArray<T extends TComparator, TComparator>(array: T[]): SortedArrayList<T, TComparator> {
    const sortedArrayList = new SortedArrayList<T, TComparator>();
    sortedArrayList.backingArray = array;
    sortedArrayList.updateSize();

    return sortedArrayList;
  }

  [Serializable.serialize](instance: SortedArrayList<T, TComparator>): T[] {
    return instance.backingArray;
  }

  [Serializable.deserialize](data: T[], tryDereference: TryDereference): SortedArrayList<T, TComparator> {
    for (let i = 0; i < data.length; i++) {
      tryDereference(data[i], (dereferenced) => (data[i] = dereferenced as T));
    }

    return SortedArrayList.fromSortedArray(data);
  }

  protected _at(index: number): T {
    return this.backingArray[index]!;
  }

  /** find index of item, can be any occurrence of it */
  fastIndexOf(item: TComparator, fromIndex?: number): number | undefined {
    return binarySearch(this.backingArray, item, this.comparator, { min: fromIndex });
  }

  protected _indexOf(item: TComparator, fromIndex?: number): number | undefined {
    return binarySearchFirst(this.backingArray, item, this.comparator, { min: fromIndex });
  }

  findIndex(predicate: Predicate<T>): number | undefined {
    return this.backingArray.findIndex((item, index) => predicate(item, index));
  }

  protected _lastIndexOf(item: TComparator, fromIndex?: number): number | undefined {
    return binarySearchLast(this.backingArray, item, this.comparator, { max: fromIndex });
  }

  findLastIndex(predicate: Predicate<T>): number | undefined {
    for (let i = this.size - 1; i >= 0; i--) {
      if (predicate(this.backingArray[i]!, i)) {
        return i;
      }
    }

    return undefined;
  }

  includes(item: T): boolean {
    const index = this.fastIndexOf(item);
    return isDefined(index);
  }

  /** same as {@link add} as it is sorted */
  prepend(item: T): void {
    this.add(item);
  }

  /** same as {@link addMany} as it is sorted */
  prependMany(items: Iterable<T>): void {
    this.addMany(items);
  }

  add(item: T): void {
    const index = binarySearchInsertionIndex(this.backingArray, item, this.comparator);
    this.backingArray.splice(index, 0, item);
    this.updateSize();
  }

  addMany(items: Iterable<T>): void {
    for (const item of items) {
      const index = binarySearchInsertionIndex(this.backingArray, item, this.comparator);
      this.backingArray.splice(index, 0, item);
    }

    this.updateSize();
  }

  /** same as `removeAt(index); add(item);` as it is sorted */
  protected _set(index: number, item: T): void {
    this.backingArray.splice(index, 1);
    this.add(item);
  }

  remove(item: T): boolean {
    const index = this.indexOf(item);

    if (isUndefined(index)) {
      return false;
    }

    this.removeAt(index);
    return true;
  }

  protected _removeAt(index: number): T {
    return this.removeManyAt(index, 1)[0]!;
  }

  protected _removeManyAt(index: number, count: number): T[] {
    const removed = this.backingArray.splice(index, count);
    this.updateSize();

    return removed;
  }

  /**
   * remove items
   * @param from
   * @param to
   */
  removeRangeByComparison(_from: TComparator, _fromType: RangeType, _to: TComparator, _toType: RangeType): void {
    throw new NotImplementedError();
  }

  clone(): SortedArrayList<T, TComparator> {
    return SortedArrayList.fromSortedArray([...this.backingArray]);
  }

  *items(): IterableIterator<T> {
    yield* this.backingArray;
  }

  *itemsReverse(): IterableIterator<T> {
    for (let i = this.size - 1; i >= 0; i--) {
      yield this.backingArray[i]!;
    }
  }

  protected _clear(): void {
    this.backingArray.splice(0, this.backingArray.length);
  }

  private updateSize(): void {
    this.setSize(this.backingArray.length);
  }
}
