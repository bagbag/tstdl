// eslint-disable-next-line max-classes-per-file
import { Serializable, serializable } from '#/serializer/_internal';
import { isDefined, isUndefined } from '#/utils';
import { Collection } from './collection';

export type LinkedListNode<T> = {
  value: T,
  previous: LinkedListNode<T> | undefined,
  next: LinkedListNode<T> | undefined
};

@serializable('LinkedList')
export class LinkedList<T> extends Collection<T, LinkedList<T>> implements Serializable<LinkedList<T>, T[]> {
  private head: LinkedListNode<T> | undefined;
  private tail: LinkedListNode<T> | undefined;

  get first(): LinkedListNode<T> | undefined {
    return this.head;
  }

  get last(): LinkedListNode<T> | undefined {
    return this.tail;
  }

  constructor(values?: Iterable<T>) {
    super();

    this.clear();

    if (isDefined(values)) {
      this.addEndMany(values);
    }
  }

  [Serializable.serialize](instance: LinkedList<T>): T[] {
    return [...instance];
  }

  [Serializable.deserialize](data: T[], tryAddToDerefQueue: (value: unknown, callback: (dereferenced: unknown) => void) => boolean): LinkedList<T> {
    const linkedList = new LinkedList<T>();

    for (const item of data) {
      const node = linkedList.add(item);
      tryAddToDerefQueue(item, (dereferenced) => (node.value = dereferenced as T));
    }

    return linkedList;
  }

  /** get value at index */
  at(index: number): LinkedListNode<T> {
    if ((index < 0) || (index > (this.size - 1))) {
      throw new Error('index out of bounds');
    }

    const indexFromEnd = (this.size - 1) - index;

    let node: LinkedListNode<T> | undefined;

    if (index <= indexFromEnd) {
      node = this.head;

      for (let i = 0; i < index; i++) {
        node = node!.next;
      }
    }
    else {
      node = this.tail;

      for (let i = 0; i < indexFromEnd; i++) {
        node = node!.previous;
      }
    }

    return node!;
  }

  /** add value at the end. Alias for {@link addEnd} */
  add(value: T): LinkedListNode<T> {
    return this.addEnd(value);
  }

  /** add value at the end */
  addEnd(value: T): LinkedListNode<T> {
    const node: LinkedListNode<T> = {
      value,
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

  /** add value at the start */
  addStart(value: T): LinkedListNode<T> {
    const node: LinkedListNode<T> = {
      value,
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

  /** add value after node */
  addAfter(node: LinkedListNode<T>, value: T): LinkedListNode<T> {
    const newNode: LinkedListNode<T> = {
      value,
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

  /** add value before node */
  addBefore(node: LinkedListNode<T>, value: T): LinkedListNode<T> {
    const newNode: LinkedListNode<T> = {
      value,
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

  /** add many values at the end. Alias for {@link addEndMany} */
  addMany(values: Iterable<T>): void {
    this.addEndMany(values);
  }

  /** add many values at the end */
  addEndMany(values: Iterable<T>): void {
    let count = 0;
    let node = this.tail;

    for (const value of values) {
      node = {
        value,
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

  /** add many values at the start */
  addStartMany(values: Iterable<T>): void {
    const oldHead = this.head;

    let count = 0;
    let node: LinkedListNode<T> | undefined;

    for (const value of values) {
      node = {
        value,
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

  /** remove node */
  remove(node: LinkedListNode<T>): void {
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

  /** remove node at index */
  removeAt(index: number): LinkedListNode<T> {
    const node = this.at(index);
    this.remove(node);

    return node;
  }

  clone(): LinkedList<T> {
    return new LinkedList(this);
  }

  /** yields all items from the buffer and removes them */
  *[Symbol.iterator](): IterableIterator<T> {
    let node = this.head;

    while (isDefined(node)) {
      yield node.value;
      node = node.next;
    }
  }

  /** yields all items from the buffer and removes them */
  *nodes(): IterableIterator<LinkedListNode<T>> {
    let node = this.head;

    while (isDefined(node)) {
      yield node;
      node = node.next;
    }
  }

  protected _clear(): void {
    this.head = undefined;
    this.tail = undefined;
  }
}
