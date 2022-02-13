import { NotImplementedError } from '#/error';
import { binarySearch, binarySearchFirst, binarySearchInsertionIndex, binarySearchLast } from '#/utils/binary-search';
import { compareByValue, compareByValueSelection } from '#/utils/comparison';
import type { Predicate } from '#/utils/iterable-helpers';
import type { Comparator } from '#/utils/sort';
import { isUndefined } from '#/utils/type-guards';
import { List } from './list';

export type RangeType = 'inclusive' | 'exclusive';

export class SortedArrayList<T extends TComparator, TComparator = T> extends List<T, SortedArrayList<T, TComparator>> {
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

  at(index: number): T {
    this.ensureBounds(index);
    return this.backingArray[index]!;
  }

  /** find index of item, can be any occurrence of it */
  fastIndexOf(item: TComparator, fromIndex?: number): number | undefined {
    return binarySearch(this.backingArray, item, this.comparator, { min: fromIndex });
  }

  indexOf(item: TComparator, fromIndex?: number): number | undefined {
    return binarySearchFirst(this.backingArray, item, this.comparator, { min: fromIndex });
  }

  findIndex(predicate: Predicate<T>): number | undefined {
    return this.backingArray.findIndex((item, index) => predicate(item, index));
  }

  lastIndexOf(item: TComparator, fromIndex?: number): number | undefined {
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
  set(index: number, item: T): void {
    this.ensureBounds(index);
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

  removeAt(index: number): T {
    return this.removeManyAt(index, 1)[0]!;
  }

  removeManyAt(index: number, count: number = this.size - index): T[] {
    this.ensureBounds(index, count);

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

const arr = new SortedArrayList<{ value: number, value2: number }>(undefined, compareByValueSelection((x) => x.value, (x) => x.value2));


arr.add({ value: 3, value2: 7 });
arr.add({ value: 3, value2: 9 });
arr.add({ value: 3, value2: 3 });
arr.add({ value: 3, value2: 4 });

console.log([...arr])
