import { FactoryMap } from '#/utils/factory-map';
import { lazyObject } from '#/utils/object/lazy-property';
import { isDefined, isUndefined } from '#/utils/type-guards';
import { CircularBuffer } from './circular-buffer';
import { Collection } from './collection';

type Node = {
  nodeKey: any,
  parentNode: Node | undefined,
  hasInnerMap: boolean,
  children: FactoryMap<any, Node>,
  hasValue: boolean,
  value: any
};

export class MultiKeyMap<K extends any[], T> extends Collection<[K, T], MultiKeyMap<K, T>> implements Map<K, T> {
  private rootNode: Node;

  readonly [Symbol.toStringTag]: string = 'MultiKeyMap';

  constructor() {
    super();

    this.rootNode = createNode(undefined, undefined);
  }

  add(value: [K, T]): void {
    this.set(value[0], value[1]);
  }

  addMany(values: Iterable<[K, T]>): void {
    for (const value of values) {
      this.set(value[0], value[1]);
    }
  }

  set(key: K, value: T): this {
    const node = this.getNode(key, true);

    const hasValue = node.hasValue;

    node.hasValue = true;
    node.value = value;

    if (!hasValue) {
      this.incrementSize();
    }

    return this;
  }

  has(key: K): boolean {
    const node = this.getNode(key, false);
    return isDefined(node) && node.hasValue;
  }

  get(key: K): T | undefined {
    const node = this.getNode(key, false);

    if (isUndefined(node)) {
      return undefined;
    }

    return node.value as T | undefined;
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

  clone(): MultiKeyMap<K, T> {
    const clone = new MultiKeyMap<K, T>();
    clone.addMany(this);

    return clone;
  }

  forEach(callback: (value: T, key: K, map: MultiKeyMap<K, T>) => void, thisArg?: any): void {
    const boundCallback = callback.bind(thisArg);

    for (const item of this) {
      boundCallback(item[1], item[0], this);
    }
  }

  entries(): IterableIterator<[K, T]> {
    return this.items();
  }

  *keys(): IterableIterator<K> {
    for (const item of this) {
      yield item[0];
    }
  }

  *values(): IterableIterator<T> {
    for (const item of this) {
      yield item[1];
    }
  }

  *items(): IterableIterator<[K, T]> {
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
    this.rootNode = createNode(undefined, undefined);
  }

  private getNode<Create extends boolean>(key: K, create: Create): Create extends true ? Node : (Node | undefined) {
    let node = this.rootNode.children.get(key[0]);

    for (let i = 1; i < key.length; i++) {
      if (!node.hasInnerMap && !create) {
        return undefined as (Create extends true ? Node : (Node | undefined));
      }

      node = node.children.get(key[i]);
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

function createNode(nodeKey: any, parentNode: Node | undefined): Node {
  return lazyObject<Node>({
    nodeKey: { value: nodeKey },
    parentNode: { value: parentNode },
    hasInnerMap: false,
    children: getChildren,
    hasValue: false,
    value: { value: undefined }
  });
}

function getChildren(this: Node): FactoryMap<any, Node> {
  this.hasInnerMap = true;
  return new FactoryMap((key) => createNode(key, this));
}
