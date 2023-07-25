import { isDefined, isUndefined } from '#/utils/type-guards.js';
import { CircularBuffer } from './circular-buffer.js';
import { Dictionary } from './dictionary.js';

type Node = {
  nodeKey: any,
  parentNode: Node | undefined,
  children: Map<any, Node> | undefined,
  hasValue: boolean,
  value: any
};

export type NewMapProvider = () => Map<any, Node>;

export class MultiKeyMap<K extends any[], V> extends Dictionary<K, V, MultiKeyMap<K, V>> {
  private readonly newMapProvider: NewMapProvider;
  private rootNode: Node;

  readonly [Symbol.toStringTag]: string = 'MultiKeyMap';

  constructor(newMapProvider: NewMapProvider = () => new Map()) {
    super();

    this.newMapProvider = newMapProvider;
    this.rootNode = createNode(undefined, undefined);
  }

  includes([key, value]: [K, V]): boolean {
    if (!this.has(key)) {
      return false;
    }

    return this.get(key) == value;
  }

  add(value: [K, V]): void {
    this.set(value[0], value[1]);
  }

  addMany(values: Iterable<[K, V]>): void {
    for (const value of values) {
      this.set(value[0], value[1]);
    }
  }

  setFlat(...keyAndValue: [...key: K, value: V]): void {
    const key = keyAndValue.slice(0, -1) as K;
    this.set(key, keyAndValue[keyAndValue.length - 1]);
  }

  set(key: K, value: V): void {
    const node = this.getNode(key, true);

    node.value = value;

    if (!node.hasValue) {
      node.hasValue = true;
      this.incrementSize();
    }
    else {
      this.emitChange();
    }
  }

  hasFlat(...key: K): boolean {
    return this.has(key);
  }

  has(key: K): boolean {
    const node = this.getNode(key);
    return isDefined(node) && node.hasValue;
  }

  getFlat(...key: K): V | undefined {
    return this.get(key);
  }

  get(key: K): V | undefined {
    const node = this.getNode(key);

    if (isUndefined(node)) {
      return undefined;
    }

    return node.value as V | undefined;
  }

  deleteFlat(...key: K): boolean {
    return this.delete(key);
  }

  delete(key: K): boolean {
    const node = this.getNode(key);

    if (isUndefined(node)) {
      return false;
    }

    const deleted = node.hasValue;
    node.hasValue = false;
    node.value = undefined;

    this.deleteNodeIfEmpty(node);

    if (deleted) {
      this.decrementSize();
    }

    return deleted;
  }

  clone(): MultiKeyMap<K, V> {
    const clone = new MultiKeyMap<K, V>();
    clone.addMany(this);

    return clone;
  }

  *keys(): IterableIterator<K> {
    for (const item of this) {
      yield item[0];
    }
  }

  *values(): IterableIterator<V> {
    for (const item of this) {
      yield item[1];
    }
  }

  *items(): IterableIterator<[K, V]> {
    const queue = new CircularBuffer<[any[], Node]>();
    queue.add([[], this.rootNode]);

    while (queue.size > 0) {
      const [key, node] = queue.remove();

      if (node.hasValue) {
        yield [key as K, node.value];
      }

      if (isDefined(node.children)) {
        for (const innerNode of node.children.values()) {
          queue.add([[...key, innerNode.nodeKey], innerNode]);
        }
      }
    }
  }

  protected _clear(): void {
    this.rootNode = createNode(undefined, undefined);
    this.setSize(0);
  }

  private getNode(key: K, create?: false): Node | undefined;
  private getNode(key: K, create: true): Node;
  private getNode(key: K, create: boolean = false): Node | undefined {
    let node = this.rootNode;

    for (const nodeKey of key) {
      if (isUndefined(node.children)) {
        if (!create) {
          return undefined;
        }

        node.children = this.newMapProvider();
      }

      let childNode = node.children.get(nodeKey);

      if (isUndefined(childNode)) {
        if (!create) {
          return undefined;
        }

        childNode = createNode(nodeKey, node);
        node.children.set(nodeKey, childNode);
      }

      node = childNode;
    }

    return node;
  }

  private deleteNodeIfEmpty(node: Node): void {
    if (node.hasValue || (isDefined(node.children) && (node.children.size > 0)) || isUndefined(node.parentNode)) {
      return;
    }

    node.parentNode.children!.delete(node.nodeKey);
    this.deleteNodeIfEmpty(node.parentNode);
  }
}

function createNode(nodeKey: any, parentNode: Node | undefined): Node {
  return {
    nodeKey,
    parentNode,
    children: undefined,
    hasValue: false,
    value: undefined
  };
}
