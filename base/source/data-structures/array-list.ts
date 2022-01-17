import { Collection } from './collection';

export class ArrayList<T> extends Collection<T, ArrayList<T>> {
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
    return this.backingArray[index]!;
  }

  add(value: T): void {
    this.backingArray.push(value);
    this.updateSize();
  }

  addMany(values: Iterable<T>): void {
    this.backingArray.push(...values);
    this.updateSize();
  }

  set(index: number, value: T): void {
    this.backingArray[index] = value;
    this.emitChange();
  }

  remove(value: T): boolean {
    const index = this.backingArray.indexOf(value);

    if (index == -1) {
      return false;
    }

    this.removeAt(index);
    return true;
  }

  removeAt(index: number, count: number = 1): void {
    this.backingArray.splice(index, count);
    this.updateSize();
  }

  indexOf(value: T): number | undefined {
    const index = this.backingArray.indexOf(value);

    if (index == -1) {
      return undefined;
    }

    return index;
  }

  clone(): ArrayList<T> {
    return new ArrayList(this.backingArray);
  }

  *[Symbol.iterator](): IterableIterator<T> {
    yield* this.backingArray;
  }

  protected _clear(): void {
    this.backingArray.splice(0, this.backingArray.length);
  }

  private updateSize(): void {
    this.setSize(this.backingArray.length);
  }
}
