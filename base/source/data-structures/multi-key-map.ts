import { lazyObject } from '#/utils/object/lazy-property.js';
import { isDefined, isUndefined } from '#/utils/type-guards.js';
import { CircularBuffer } from './circular-buffer.js';
import { Dictionary } from './dictionary.js';

type Node = {
  nodeKey: any,
  parentNode: Node | undefined,
  hasInnerMap: boolean,
  children: Map<any, Node>,
  hasValue: boolean,
  value: any
};

type NewMapProvider = () => Map<any, Node>;

export class MultiKeyMap<K extends any[], V> extends Dictionary<K, V, MultiKeyMap<K, V>> {
  private readonly newMapProvider: NewMapProvider;
  private rootNode: Node;

  readonly [Symbol.toStringTag]: string = 'MultiKeyMap';

  constructor(newMapProvider: NewMapProvider = () => new Map()) {
    super();

    this.newMapProvider = newMapProvider;
    this.rootNode = createNode(undefined, undefined, this.newMapProvider);
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

    const hasValue = node.hasValue;

    node.hasValue = true;
    node.value = value;

    if (!hasValue) {
      this.incrementSize();
    }
  }

  hasFlat(...key: K): boolean {
    return this.has(key);
  }

  has(key: K): boolean {
    const node = this.getNode(key, false);
    return isDefined(node) && node.hasValue;
  }

  getFlat(...key: K): V | undefined {
    return this.get(key);
  }

  get(key: K): V | undefined {
    const node = this.getNode(key, false);

    if (isUndefined(node)) {
      return undefined;
    }

    return node.value as V | undefined;
  }

  deleteFlat(...key: K): boolean {
    return this.delete(key);
  }

  delete(key: K): boolean {
    const node = this.getNode(key, false);

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

      if (node.hasInnerMap) {
        for (const innerNode of node.children.values()) {
          queue.add([[...key, innerNode.nodeKey], innerNode]);
        }
      }
    }
  }

  protected _clear(): void {
    this.rootNode = createNode(undefined, undefined, this.newMapProvider);
  }

  private getNode<Create extends boolean>(key: K, create: Create): Create extends true ? Node : (Node | undefined) {
    let node = getOrCreateChildNode(this.rootNode, key[0], this.newMapProvider);

    for (let i = 1; i < key.length; i++) {
      if (!node.hasInnerMap && !create) {
        return undefined as (Create extends true ? Node : (Node | undefined));
      }

      node = getOrCreateChildNode(this.rootNode, key[i], this.newMapProvider);
    }

    return node;
  }

  private deleteNodeIfEmpty(node: Node): void {
    if (node.hasValue || (node.hasInnerMap && node.children.size > 0) || isUndefined(node.parentNode)) {
      return;
    }

    node.parentNode.children.delete(node.nodeKey);
    this.deleteNodeIfEmpty(node.parentNode);
  }
}

function getOrCreateChildNode(node: Node, key: any, newMapProvider: NewMapProvider): Node {
  const childNode = node.children.get(key);

  if (isDefined(childNode)) {
    return childNode;
  }

  const newNode = createNode(key, node, newMapProvider);
  node.children.set(key, newNode);

  return newNode;
}

function createNode(nodeKey: any, parentNode: Node | undefined, newMapProvider: NewMapProvider): Node {
  return lazyObject<Node>({
    nodeKey: { value: nodeKey },
    parentNode: { value: parentNode },
    hasInnerMap: false,
    children() {
      return getChildren(this, newMapProvider);
    },
    hasValue: false,
    value: { value: undefined }
  });
}

function getChildren(node: Node, newMapProvider: NewMapProvider): Map<any, Node> {
  node.hasInnerMap = true;
  return newMapProvider();
}
