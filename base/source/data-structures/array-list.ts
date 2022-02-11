import type { Predicate } from '#/utils/iterable-helpers';
import { List } from './list';

export class ArrayList<T> extends List<T, ArrayList<T>> {
  private backingArray: T[];

  constructor(items: Iterable<T> = []) {
    super();

    this.backingArray = [...items];
    this.updateSize();
  }

  /**
   * creates a new ArrayCollection from existing array without copying data
   * @param array array to use as new backing array for this ArrayCollection
   */
  static fromArray<T>(array: T[]): ArrayList<T> {
    const arrayList = new ArrayList<T>();
    arrayList.backingArray = array;
    arrayList.updateSize();

    return arrayList;
  }

  at(index: number): T {
    this.ensureBounds(index);
    return this.backingArray[index]!;
  }

  indexOf(item: T, fromIndex?: number): number | undefined {
    const index = this.backingArray.indexOf(item, fromIndex);

    if (index == -1) {
      return undefined;
    }

    return index;
  }

  findIndex(predicate: Predicate<T>): number | undefined {
    return this.backingArray.findIndex((item, index) => predicate(item, index));
  }

  lastIndexOf(item: T, fromIndex?: number): number | undefined {
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

  set(index: number, item: T): void {
    this.ensureBounds(index);
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

  removeAt(index: number): T {
    this.ensureBounds(index);
    return this.removeManyAt(index, 1)[0]!;
  }

  removeManyAt(index: number, count?: number): T[] {
    this.ensureBounds(index, count);

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
