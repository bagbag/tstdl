import { Collection } from './collection';

export class ArrayList<T> extends Collection<T, ArrayList<T>> {
  private backingArray: T[];

  constructor(items: Iterable<T> = []) {
    super();

    this.backingArray = [...items];
  }

  /**
   * creates a new ArrayCollection from existing array without copying data
   * @param array array to use as new backing array for this ArrayCollection
   */
  static fromArray<T>(array: T[]): ArrayList<T> {
    const arrayList = new ArrayList<T>();
    arrayList.backingArray = array;
    arrayList.setSize(array.length);

    return arrayList;
  }

  at(index: number): T {
    return this.backingArray[index]!;
  }

  add(value: T): void {
    this.backingArray.push(value);
    super.incrementSize();
  }

  addMany(values: Iterable<T>): void {
    this.backingArray.push(...values);
    this.setSize(this.backingArray.length);
  }

  set(index: number, value: T): void {
    this.backingArray[index] = value;
    this.emitChange();
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
}
