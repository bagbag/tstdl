# @tstdl/base/data-structures

A comprehensive library of advanced, observable data structures for TypeScript, providing powerful and flexible alternatives to native collections.

## Table of Contents

- [Features](#features)
- [Core Concepts](#core-concepts)
- [Usage](#usage)
  - [ArrayList](#arraylist)
  - [SortedArrayList](#sortedarraylist)
  - [LinkedList](#linkedlist)
  - [CircularBuffer](#circularbuffer)
  - [MapDictionary](#mapdictionary)
  - [MultiKeyMap](#multikeymap)
  - [SetCollection](#setcollection)
  - [MultiKeySet](#multikeyset)
  - [Cache (LRU)](#cache-lru)
  - [IterableWeakMap](#iterableweakmap)
  - [WeakRefMap](#weakrefmap)
- [API Summary](#api-summary)

## Features

- **Observable Collections**: Track changes, size, and other state mutations via RxJS Observables and Signals.
- **Rich Data Structure Set**: Includes Lists (Array, Sorted, Linked), Dictionaries, Sets, Buffers, and Caches.
- **Specialized Maps**: Advanced map implementations like `MultiKeyMap`, `IterableWeakMap`, and `WeakRefMap` for complex use cases.
- **Type-Safe API**: Designed with strong typing to enhance developer experience and reduce errors.
- **Native Adapters**: Use `asMap()` and `asSet()` methods for seamless integration with APIs expecting native `Map` and `Set` objects without data copying.
- **Performance-Oriented**: Choose from different implementations (e.g., `ArrayDictionary` vs. `MapDictionary`) based on performance needs.

## Core Concepts

### Collection Hierarchy

The module is built on a hierarchy of abstract base classes that define common interfaces:

- **`Collection<T>`**: The foundation for all data structures in this module. It provides the core observability features, including `size$`, `change$`, and their corresponding Signal counterparts (`$size`, `$observe`). Any change that affects the collection's state will emit an event.
- **`List<T>`**: Extends `Collection` for ordered, indexed data structures. It defines methods for index-based access and manipulation like `at(index)`, `removeAt(index)`, and `indexOf(item)`.
- **`Dictionary<K, V>`**: The base for key-value pair collections, similar to the native `Map`.
- **`DistinctCollection<T>`**: The base for collections of unique values, similar to the native `Set`.

### Observability

A key feature of this module is that all collections are observable. You can react to changes in real-time, which is ideal for building reactive applications.

```typescript
import { ArrayList } from '@tstdl/base/data-structures';

const users = new ArrayList<{ id: number, name: string }>();

users.size$.subscribe(newSize => {
  console.log(`The list now contains ${newSize} users.`);
});

users.observe$.subscribe(updatedList => {
  console.log('The list has changed:', updatedList.toArray());
});

users.add({ id: 1, name: 'Alice' }); // Logs size 1 and the new list
users.add({ id: 2, name: 'Bob' });   // Logs size 2 and the new list
```

## Usage

### ArrayList

A `List` implementation backed by a standard JavaScript array. It's a general-purpose, ordered collection.

```typescript
import { ArrayList } from '@tstdl/base/data-structures';

const pets = new ArrayList(['cat', 'dog']);

// Add items
pets.add('bird');
pets.prepend('fish'); // ['fish', 'cat', 'dog', 'bird']

// Access items
console.log(pets.at(1)); // 'cat'
console.log(pets.first); // 'fish'
console.log(pets.last);  // 'bird'

// Remove items
pets.remove('dog'); // true
pets.removeAt(0);   // removes 'fish'

console.log(pets.toArray()); // ['cat', 'bird']
```

### SortedArrayList

A `List` that automatically maintains its elements in a sorted order based on a provided comparator function.

```typescript
import { SortedArrayList } from '@tstdl/base/data-structures';

interface User {
  name: string;
  age: number;
}

// Sort users by age, ascending
const userComparator = (a: User, b: User) => a.age - b.age;
const users = new SortedArrayList<User>([], userComparator);

users.addMany([
  { name: 'Bob', age: 30 },
  { name: 'Alice', age: 25 },
  { name: 'Charlie', age: 35 }
]);

// The list is always sorted
console.log(users.toArray());
// Output: [{ name: 'Alice', age: 25 }, { name: 'Bob', age: 30 }, { name: 'Charlie', age: 35 }]

// Find an item's index efficiently using binary search
const index = users.fastIndexOf({ name: 'Bob', age: 30 }); // 1
```

### LinkedList

A performant implementation of a doubly-linked `List`. It excels at adding or removing items from the beginning or end of the list, or when you have a direct reference to a node.

```typescript
import { LinkedList, type LinkedListNode } from '@tstdl/base/data-structures';

const tasks = new LinkedList<string>();

const firstNode = tasks.add('Write code');
const secondNode = tasks.add('Test code');
tasks.prepend('Plan feature');

// Add an item after a specific node
tasks.addAfterNode(firstNode, 'Review code');

console.log(tasks.toArray());
// Output: ['Plan feature', 'Write code', 'Review code', 'Test code']
```

### CircularBuffer

A fixed-size buffer that overwrites the oldest elements when its capacity is exceeded. It's useful for managing streams of data, logs, or undo history.

```typescript
import { CircularBuffer } from '@tstdl/base/data-structures';

const buffer = new CircularBuffer<string>(3);

buffer.overflow$.subscribe(overwrittenItem => {
  console.log(`Overwritten: ${overwrittenItem}`);
});

buffer.add('A');
buffer.add('B');
buffer.add('C');
console.log(buffer.toArray()); // ['A', 'B', 'C']

// Adding 'D' will overwrite 'A'
buffer.add('D'); // Logs "Overwritten: A"
console.log(buffer.toArray()); // ['B', 'C', 'D']

// Consume and remove an item
const item = buffer.remove(); // 'B'
console.log(buffer.toArray()); // ['C', 'D']
```

### MapDictionary

A `Dictionary` (key-value collection) backed by the native JavaScript `Map`. It offers excellent performance for general use.

```typescript
import { MapDictionary } from '@tstdl/base/data-structures';

const productPrices = new MapDictionary<string, number>();

productPrices.set('Apple', 1.2);
productPrices.set('Banana', 0.8);

console.log(productPrices.get('Apple')); // 1.2
console.log(productPrices.has('Orange')); // false

productPrices.delete('Banana');

for (const [product, price] of productPrices) {
  console.log(`${product}: $${price}`);
}
```

### MultiKeyMap

A powerful map that allows using an array of keys to store and retrieve a value, effectively creating a nested map structure.

```typescript
import { MultiKeyMap } from '@tstdl/base/data-structures';

const permissions = new MultiKeyMap<[string, string, string], boolean>(); // [userId, resource, action]

permissions.set(['user-1', 'products', 'read'], true);
permissions.set(['user-1', 'products', 'write'], false);
permissions.set(['user-2', 'orders', 'read'], true);

// Use the full key array to get a value
const canReadProducts = permissions.get(['user-1', 'products', 'read']); // true

// Use the flat API for convenience
const canWriteProducts = permissions.getFlat('user-1', 'products', 'write'); // false
```

### SetCollection

A `DistinctCollection` of unique values, backed by the native JavaScript `Set`.

```typescript
import { SetCollection } from '@tstdl/base-data-structures';

const tags = new SetCollection<string>();

tags.add('typescript');
tags.add('developer');
tags.add('typescript'); // This will be ignored as it's a duplicate

console.log(tags.has('typescript')); // true
console.log(tags.size); // 2

tags.delete('developer');
console.log(tags.toArray()); // ['typescript']
```

### MultiKeySet

A `DistinctCollection` that stores arrays of values as its unique elements.

```typescript
import { MultiKeySet } from '@tstdl/base/data-structures';

const visitedCoordinates = new MultiKeySet<[number, number]>();

visitedCoordinates.add([10, 20]);
visitedCoordinates.add([30, 40]);
visitedCoordinates.add([10, 20]); // Ignored duplicate

console.log(visitedCoordinates.has([10, 20])); // true
console.log(visitedCoordinates.has([10, 21])); // false
console.log(visitedCoordinates.size); // 2
```

### Cache (LRU)

A simple Least Recently Used (LRU) cache with a fixed capacity. When the cache is full, the least recently used item is evicted to make room for a new one.

```typescript
import { Cache } from '@tstdl/base/data-structures';

const userCache = new Cache<string, { name: string }>(2);

userCache.set('user-1', { name: 'Alice' });
userCache.set('user-2', { name: 'Bob' });

// Accessing user-1 makes it the most recently used
userCache.get('user-1');

// Adding user-3 will evict the least recently used item (user-2)
userCache.set('user-3', { name: 'Charlie' });

console.log(userCache.get('user-2')); // undefined
console.log(userCache.get('user-1')); // { name: 'Alice' }
```

### IterableWeakMap

A `WeakMap` that can be iterated over. Keys are held weakly, meaning they don't prevent garbage collection if they are the only reference to an object.

```typescript
import { IterableWeakMap } from '@tstdl/base/data-structures';

const metadata = new IterableWeakMap<object, { lastAccess: number }>();
let user: object | null = { id: 1 };

metadata.set(user, { lastAccess: Date.now() });

console.log(metadata.get(user)); // { lastAccess: ... }

// Iterate over the map
for (const [key, value] of metadata) {
  console.log(key, value);
}

// Once `user` is garbage collected, its entry will eventually be removed from the map.
user = null;
```

### WeakRefMap

A map where keys are held strongly, but values are held weakly via `WeakRef`. This is useful for caching large objects that can be regenerated if they are garbage collected.

```typescript
import { WeakRefMap } from '@tstdl/base/data-structures';

const largeObjectCache = new WeakRefMap<string, object>();
let largeObject: object | null = { data: '...' };

largeObjectCache.set('report-1', largeObject);

// Dereference the object
console.log(largeObjectCache.get('report-1')); // { data: '...' }

// Remove strong reference
largeObject = null;

// After garbage collection, get() will return undefined
// console.log(largeObjectCache.get('report-1')); // undefined
```

## API Summary

| Class | Constructor | Description |
| :--- | :--- | :--- |
| `ArrayList<T>` | `new ArrayList(items?: Iterable<T>)` | A `List` implementation backed by a native array. |
| `SortedArrayList<T>` | `new SortedArrayList(items?: Iterable<T>, comparator?: Comparator<T>)` | A `List` that keeps its elements sorted. |
| `LinkedList<T>` | `new LinkedList(items?: Iterable<T>)` | A `List` implementation using a doubly-linked list. |
| `CircularBuffer<T>` | `new CircularBuffer(maxBufferSize?: number)` | A fixed-capacity buffer that overwrites old items when full. |
| `MapDictionary<K, V>` | `new MapDictionary(items?: Iterable<[K, V]>)` | A `Dictionary` backed by a native `Map`. Recommended for general use. |
| `ArrayDictionary<K, V>` | `new ArrayDictionary(items?: Iterable<[K, V]>)` | A `Dictionary` backed by parallel arrays. |
| `MultiKeyMap<K[], V>` | `new MultiKeyMap()` | A map that uses an array of keys to store a value. |
| `SetCollection<T>` | `new SetCollection(items?: Iterable<T>)` | A `DistinctCollection` for unique values, backed by a native `Set`. |
| `MultiKeySet<T[]>` | `new MultiKeySet()` | A `DistinctCollection` that stores arrays as unique values. |
| `Cache<K, V>` | `new Cache(capacity: number)` | A simple Least Recently Used (LRU) cache with a fixed capacity. |
| `IterableWeakMap<K, V>` | `new IterableWeakMap(entries?: Iterable<[K, V]>)` | A `WeakMap` implementation that supports iteration. |
| `WeakRefMap<K, V>` | `new WeakRefMap()` | A `Map` where values are held by a `WeakRef`. |