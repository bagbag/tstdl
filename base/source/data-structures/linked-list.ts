/* eslint-disable @typescript-eslint/member-ordering */
// eslint-disable-next-line max-classes-per-file
import type { TryDereference } from '#/serializer/serializable';
import { Serializable, serializable } from '#/serializer/serializable';
import type { Predicate } from '#/utils/iterable-helpers';
import { isDefined, isUndefined } from '#/utils/type-guards';
import { List } from './list';

export type LinkedListNode<T> = {
  /** item of node */
  item: T,

  /** previous node. Warning: it is not safe to use this reference on a removed node */
  previous: LinkedListNode<T> | undefined,

  /** next node. Warning: it is not safe to use this reference on a removed node */
  next: LinkedListNode<T> | undefined
};

@serializable('LinkedList')
export class LinkedList<T> extends List<T, LinkedList<T>> implements Serializable<LinkedList<T>, T[]> {
  private head: LinkedListNode<T> | undefined;
  private tail: LinkedListNode<T> | undefined;

  get firstNode(): LinkedListNode<T> | undefined {
    return this.head;
  }

  get lastNode(): LinkedListNode<T> | undefined {
    return this.tail;
  }

  constructor(items?: Iterable<T>) {
    super();

    this.clear();

    if (isDefined(items)) {
      this.addMany(items);
    }
  }

  [Serializable.serialize](instance: LinkedList<T>): T[] {
    return [...instance];
  }

  [Serializable.deserialize](data: T[], tryDereference: TryDereference): LinkedList<T> {
    const linkedList = new LinkedList<T>();

    for (const item of data) {
      const node = linkedList.add(item);
      tryDereference(item, (dereferenced) => (node.item = dereferenced as T));
    }

    return linkedList;
  }

  protected _at(index: number): T {
    const node = this.nodeAt(index);
    return node.item;
  }

  /** get node at index */
  nodeAt(index: number): LinkedListNode<T> {
    const normalizedIndex = this.normalizeIndex(index);
    this.ensureBounds(normalizedIndex);

    const indexFromEnd = (this.size - 1) - normalizedIndex;

    let node: LinkedListNode<T>;

    if (normalizedIndex <= indexFromEnd) {
      node = this.head!;

      for (let i = 0; i < normalizedIndex; i++) {
        node = node!.next!;
      }
    }
    else {
      node = this.tail!;

      for (let i = 0; i < indexFromEnd; i++) {
        node = node!.previous!;
      }
    }

    return node;
  }

  protected _indexOf(item: T, fromIndex: number = 0): number | undefined {
    let index = 0;

    for (const node of this.nodes()) {
      if (index < fromIndex) {
        continue;
      }

      if (node.item == item) {
        return index;
      }

      index++;
    }

    return undefined;
  }

  nodeOf(item: T): LinkedListNode<T> | undefined {
    for (const node of this.nodes()) {
      if (node.item == item) {
        return node;
      }
    }

    return undefined;
  }

  findIndex(predicate: Predicate<T>): number | undefined {
    let index = 0;

    for (const node of this.nodes()) {
      if (predicate(node.item, index)) {
        return index;
      }

      index++;
    }

    return undefined;
  }

  protected _lastIndexOf(item: T, fromIndex: number = (this.size - 1)): number | undefined {
    let index = this.size - 1;

    for (const node of this.nodesReverse()) {
      if (index > fromIndex) {
        continue;
      }

      if (node.item == item) {
        return index;
      }

      index--;
    }

    return undefined;
  }

  findLastIndex(predicate: Predicate<T>): number | undefined {
    let index = this.size - 1;

    for (const node of this.nodesReverse()) {
      if (predicate(node.item, index)) {
        return index;
      }

      index++;
    }

    return undefined;
  }

  lastNodeOf(item: T): LinkedListNode<T> | undefined {
    for (const node of this.nodesReverse()) {
      if (node.item == item) {
        return node;
      }
    }

    return undefined;
  }

  protected _set(index: number, item: T): void {
    const node = this.nodeAt(index);
    node.item = item;
    this.emitChange();
  }

  add(item: T): LinkedListNode<T> {
    const node: LinkedListNode<T> = {
      item,
      previous: undefined,
      next: undefined
    };

    if (isDefined(this.tail)) {
      this.tail.next = node;
      node.previous = this.tail;
      this.tail = node;
    }
    else {
      this.head = node;
      this.tail = node;
    }

    this.incrementSize();
    return node;
  }

  prepend(item: T): LinkedListNode<T> {
    const node: LinkedListNode<T> = {
      item,
      previous: undefined,
      next: this.head
    };

    if (isDefined(this.head)) {
      this.head.previous = node;
      this.head = node;
    }
    else {
      this.head = node;
      this.tail = node;
    }

    this.incrementSize();
    return node;
  }

  /** add item after node */
  addAfterNode(node: LinkedListNode<T>, item: T): LinkedListNode<T> {
    const newNode: LinkedListNode<T> = {
      item,
      previous: node,
      next: node.next
    };

    node.next = newNode;

    if (isDefined(newNode.next)) {
      newNode.next.previous = newNode;
    }
    else {
      this.tail = newNode;
    }

    this.incrementSize();
    return newNode;
  }

  /** add item before node */
  addBeforeNode(node: LinkedListNode<T>, item: T): LinkedListNode<T> {
    const newNode: LinkedListNode<T> = {
      item,
      previous: node.previous,
      next: node
    };

    node.previous = newNode;

    if (isDefined(newNode.previous)) {
      newNode.previous.next = newNode;
    }
    else {
      this.head = newNode;
    }

    this.incrementSize();
    return newNode;
  }

  addMany(items: Iterable<T>): void {
    let count = 0;
    let node = this.tail;

    for (const item of items) {
      node = {
        item,
        previous: node,
        next: undefined
      };

      if (count != 0) {
        node.previous!.next = node;
      }
      else {
        if (isDefined(node.previous)) {
          node.previous.next = node;
        }

        if (isUndefined(this.head)) {
          this.head = node;
        }
      }

      count++;
    }

    if (count > 0) {
      this.tail = node;
      this.incrementSize(count);
    }
  }

  /** add many items at the start */
  prependMany(items: Iterable<T>): void {
    const oldHead = this.head;

    let count = 0;
    let node: LinkedListNode<T> | undefined;

    for (const item of items) {
      node = {
        item,
        previous: node,
        next: undefined
      };

      if (count != 0) {
        node.previous!.next = node;
      }
      else {
        this.head = node;
      }

      count++;
    }

    if (count > 0) {
      if (isDefined(oldHead)) {
        node!.next = oldHead;
        oldHead.previous = node;
      }
      else {
        this.tail = node;
      }

      this.incrementSize(count);
    }
  }

  remove(item: T): boolean {
    const node = this.nodeOf(item);

    if (isDefined(node)) {
      this.removeNode(node);
      return true;
    }

    return false;
  }

  protected _removeAt(index: number): T {
    const node = this.removeNodeAt(index);
    return node.item;
  }

  protected _removeManyAt(index: number, count?: number): T[] {
    const nodes = this.removeManyNodesAt(index, count);
    return nodes.map((node) => node.item);
  }

  /** remove node at index */
  removeNodeAt(index: number): LinkedListNode<T> {
    const normalizedIndex = this.normalizeIndex(index);
    this.ensureBounds(normalizedIndex);

    const node = this.nodeAt(normalizedIndex);
    this.removeNode(node);

    return node;
  }

  /** remove node */
  removeNode(node: LinkedListNode<T>): void {
    if (isDefined(node.previous)) {
      node.previous.next = node.next;
    }

    if (isDefined(node.next)) {
      node.next.previous = node.previous;
    }

    if (node == this.head) {
      this.head = node.next;
    }

    if (node == this.tail) {
      this.tail = node.previous;
    }

    this.decrementSize();
  }

  removeManyNodesAt(index: number, count: number = this.size - index): LinkedListNode<T>[] {
    const normalizedIndex = this.normalizeIndex(index);
    this.ensureBounds(normalizedIndex, count);

    if (count <= 0) {
      return [];
    }

    const firstNode = this.nodeAt(normalizedIndex);
    const nodes: LinkedListNode<T>[] = [firstNode];
    let lastNode = firstNode;

    for (let i = 1; i < count; i++) {
      lastNode = lastNode.next!;
      nodes.push(lastNode);
    }

    if (isDefined(firstNode.previous)) {
      firstNode.previous.next = lastNode.next;
    }
    else {
      this.head = lastNode.next;
    }

    if (isDefined(lastNode.next)) {
      lastNode.next.previous = firstNode.previous;
    }
    else {
      this.tail = firstNode.previous;
    }

    this.decrementSize(count);

    return nodes;
  }

  clone(): LinkedList<T> {
    return new LinkedList(this);
  }

  *items(): IterableIterator<T> {
    let node = this.head;

    while (isDefined(node)) {
      yield node.item;
      node = node.next;
    }
  }

  *itemsReverse(): IterableIterator<T> {
    let node = this.tail;

    while (isDefined(node)) {
      yield node.item;
      node = node.previous;
    }
  }

  /** yields all nodes from the list */
  *nodes(): IterableIterator<LinkedListNode<T>> {
    let node = this.head;

    while (isDefined(node)) {
      yield node;
      node = node.next;
    }
  }

  /** yields all nodes from the list in reverse */
  *nodesReverse(): IterableIterator<LinkedListNode<T>> {
    let node = this.tail;

    while (isDefined(node)) {
      yield node;
      node = node.previous;
    }
  }

  protected _clear(): void {
    this.head = undefined;
    this.tail = undefined;
  }
}
