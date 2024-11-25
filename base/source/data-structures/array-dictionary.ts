import { isDefined } from '#/utils/type-guards.js';
import { Dictionary } from './dictionary.js';

export class ArrayDictionary<K, V> extends Dictionary<K, V, ArrayDictionary<K, V>> {
  private keyArray: K[];
  private valueArray: V[];

  readonly [Symbol.toStringTag]: string = 'ArrayDictionary';

  constructor(items?: Iterable<readonly [K, V]>) {
    super();

    this.keyArray = [];
    this.valueArray = [];

    if (isDefined(items)) {
      this.addMany(items);
      this.updateSize();
    }
  }

  has(key: K): boolean {
    return this.keyArray.includes(key);
  }

  get(key: K): V | undefined {
    const index = this.keyArray.indexOf(key);

    if (index == -1) {
      return undefined;
    }

    return this.valueArray[index];
  }

  set(key: K, value: V): void {
    const index = this.keyArray.indexOf(key);

    if (index == -1) {
      this.keyArray.push(key);
      this.valueArray.push(value);
    }
    else {
      this.valueArray[index] = value;
    }

    this.updateSize();
  }

  delete(key: K): boolean {
    const index = this.keyArray.indexOf(key);

    if (index == -1) {
      return false;
    }

    this.keyArray[index] = this.keyArray[this.keyArray.length - 1]!;
    this.valueArray[index] = this.valueArray[this.valueArray.length - 1]!;
    this.keyArray.length -= 1;
    this.valueArray.length -= 1;

    this.updateSize();
    return true;
  }

  includes([key, value]: [K, V]): boolean {
    const index = this.keyArray.indexOf(key);

    if (index == -1) {
      return false;
    }

    return this.valueArray[index] == value;
  }

  add(item: [K, V]): void {
    this.set(item[0], item[1]);
  }

  addMany(items: Iterable<readonly [K, V]>): void {
    for (const [key, value] of items) {
      const index = this.keyArray.indexOf(key);

      if (index == -1) {
        this.keyArray.push(key);
        this.valueArray.push(value);
      }
      else {
        this.valueArray[index] = value;
      }
    }

    this.updateSize();
  }

  clone(): ArrayDictionary<K, V> {
    const arrayDictionary = new ArrayDictionary<K, V>();
    arrayDictionary.keyArray = [...this.keyArray];
    arrayDictionary.valueArray = [...this.valueArray];
    arrayDictionary.updateSize();

    return arrayDictionary;
  }

  *items(): MapIterator<[K, V]> {
    for (let i = 0; i < this.keyArray.length; i++) {
      yield [this.keyArray[i]!, this.valueArray[i]!];
    }
  }

  keys(): MapIterator<K> {
    return this.keyArray[Symbol.iterator]();
  }

  values(): MapIterator<V> {
    return this.valueArray[Symbol.iterator]();
  }

  protected _clear(): void {
    this.keyArray = [];
    this.valueArray = [];
  }

  private updateSize(): void {
    this.setSize(this.keyArray.length / 2);
  }
}
