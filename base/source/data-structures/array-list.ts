/* eslint-disable @typescript-eslint/member-ordering */
import type { Predicate } from '#/utils/iterable-helpers/types.js';
import { List } from './list.js';

export class ArrayList<T> extends List<T, ArrayList<T>> {
  private backingArray: T[];

  constructor(items: Iterable<T> = []) {
    super();

    this.backingArray = [...items];
    this.updateSize();
  }

  /**
   * creates a new {@link ArrayList} from existing array without copying data
   * @param array array to use as new backing array for this {@link ArrayList}
   */
  static fromArray<T>(array: T[]): ArrayList<T> {
    const arrayList = new ArrayList<T>();
    arrayList.backingArray = array;
    arrayList.updateSize();

    return arrayList;
  }

  protected _at(index: number): T {
    return this.backingArray[index]!;
  }

  protected _indexOf(item: T, fromIndex?: number): number | undefined {
    const index = this.backingArray.indexOf(item, fromIndex);

    if (index == -1) {
      return undefined;
    }

    return index;
  }

  findIndex(predicate: Predicate<T>): number | undefined {
    return this.backingArray.findIndex((item, index) => predicate(item, index));
  }

  protected _lastIndexOf(item: T, fromIndex?: number): number | undefined {
    const index = this.backingArray.lastIndexOf(item, fromIndex);

    if (index == -1) {
      return undefined;
    }

    return index;
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
    return this.backingArray.includes(item);
  }

  prepend(item: T): void {
    this.backingArray.unshift(item);
    this.updateSize();
  }

  prependMany(items: Iterable<T>): void {
    this.backingArray.unshift(...items);
    this.updateSize();
  }

  add(item: T): void {
    this.backingArray.push(item);
    this.updateSize();
  }

  addMany(items: Iterable<T>): void {
    this.backingArray.push(...items);
    this.updateSize();
  }

  protected _set(index: number, item: T): void {
    this.backingArray[index] = item;
    this.emitChange();
  }

  remove(item: T): boolean {
    const index = this.backingArray.indexOf(item);

    if (index == -1) {
      return false;
    }

    this.removeAt(index);
    return true;
  }

  protected _removeAt(index: number): T {
    if (index == 0) {
      return this.backingArray.shift()!;
    }

    return this.removeManyAt(index, 1)[0]!;
  }

  protected _removeManyAt(index: number, count: number): T[] {
    const removed = this.backingArray.splice(index, count);
    this.updateSize();

    return removed;
  }

  clone(): ArrayList<T> {
    return new ArrayList(this.backingArray);
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
