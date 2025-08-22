# Enumerable

Provides a fluent, LINQ-inspired API for querying and manipulating synchronous and asynchronous iterables in TypeScript.

## Table of Contents

- [Features](#features)
- [Core Concepts](#core-concepts)
- [Usage](#usage)
- [API Summary](#api-summary)

## Features

- **Fluent API**: Chain methods together for expressive and readable data manipulation.
- **Lazy Evaluation**: Operations are deferred until the result is needed, improving performance by avoiding intermediate collections.
- **Sync & Async Support**: Unified API for both synchronous (`Enumerable`) and asynchronous (`AsyncEnumerable`) data sources.
- **Rich Method Set**: A comprehensive suite of LINQ-inspired methods like `map`, `filter`, `reduce`, `groupToMap`, `sort`, `take`, `skip`, and more.
- **Parallel Processing**: `AsyncEnumerable` supports concurrent operations (`parallelMap`, `parallelFilter`) to accelerate I/O-bound or CPU-intensive tasks.
- **Interoperability**: Easily create enumerables from arrays, sets, observables, and generators, and convert them back to standard collections like `Array` and `Set`.

## Core Concepts

This module revolves around two primary classes that wrap iterable data sources to provide powerful querying capabilities.

### `Enumerable<T>`

The `Enumerable<T>` class is a wrapper for any standard synchronous JavaScript iterable (e.g., `Array`, `Set`, `Map`, or a generator function). It provides a rich set of methods for filtering, transforming, sorting, and aggregating data.

Most operations are **lazily evaluated**. This means that no computation is performed until a "terminal" method (one that materializes the result, like `toArray()` or `first()`) is called. This approach avoids creating intermediate arrays and can significantly improve performance for complex query chains on large datasets.

### `AsyncEnumerable<T>`

The `AsyncEnumerable<T>` is the asynchronous counterpart to `Enumerable<T>`. It can wrap both synchronous (`Iterable<T>`) and asynchronous (`AsyncIterable<T>`) data sources, such as async generator functions or RxJS `Observable`s.

It offers a similar API, but its methods are asynchronous. Terminal methods return a `Promise` that resolves with the final result. A key advantage of `AsyncEnumerable<T>` is its ability to perform operations in parallel, which can drastically reduce execution time for tasks involving network requests, file I/O, or heavy computation.

## Usage

### Using `Enumerable<T>` for Synchronous Operations

You can create an `Enumerable` from any standard iterable, like an array.

```typescript
import { Enumerable } from '@tstdl/base/enumerable';

interface User {
  id: number;
  name: string;
  age: number;
  isActive: boolean;
}

const users: User[] = [
  { id: 1, name: 'Alice', age: 30, isActive: true },
  { id: 2, name: 'Bob', age: 25, isActive: false },
  { id: 3, name: 'Charlie', age: 35, isActive: true },
  { id: 4, name: 'David', age: 30, isActive: true },
];

const activeUserNames = Enumerable.from(users)
  .filter(user => user.isActive)
  .sort((a, b) => a.age - b.age)
  .map(user => user.name)
  .toArray();

console.log(activeUserNames); // Output: ['Alice', 'David', 'Charlie']
```

### Grouping Items

The `groupToMap` method is useful for categorizing items into a `Map`.

```typescript
import { Enumerable } from '@tstdl/base/enumerable';

//... (users array from previous example)

const usersByAge = Enumerable.from(users).groupToMap(user => user.age);

console.log(usersByAge.get(30));
// Output:
// [
//   { id: 1, name: 'Alice', age: 30, isActive: true },
//   { id: 4, name: 'David', age: 30, isActive: true }
// ]
```

### Using `AsyncEnumerable<T>` for Asynchronous Operations

`AsyncEnumerable` is ideal for handling data from asynchronous sources like APIs or databases.

```typescript
import { AsyncEnumerable } from '@tstdl/base/enumerable';

interface Product {
  id: string;
  name: string;
  price: number;
}

async function* fetchProducts(): AsyncGenerator<Product> {
  yield { id: 'p1', name: 'Laptop', price: 1200 };
  yield { id: 'p2', name: 'Mouse', price: 25 };
  yield { id: 'p3', name: 'Keyboard', price: 75 };
}

const productNames = await AsyncEnumerable.from(fetchProducts())
  .filter(product => product.price > 50)
  .map(product => product.name)
  .toArray();

console.log(productNames); // Output: ['Laptop', 'Keyboard']
```

### Parallel Processing with `AsyncEnumerable<T>`

Use `parallelMap` to process items concurrently. This is highly effective for I/O-bound tasks.

```typescript
import { AsyncEnumerable } from '@tstdl/base/enumerable';

const productIds = ['p1', 'p2', 'p3'];

async function getProductDetails(id: string): Promise<{ id: string, details: string }> {
  // Simulate a network request
  await new Promise(resolve => setTimeout(resolve, 50));
  return { id, details: `Details for ${id}` };
}

// Process API calls in parallel with a concurrency of 2
const productDetails = await AsyncEnumerable.from(productIds)
  .parallelMap(2, true, id => getProductDetails(id))
  .toArray();

console.log(productDetails);
// Output:
// [
//   { id: 'p1', details: 'Details for p1' },
//   { id: 'p2', details: 'Details for p2' },
//   { id: 'p3', details: 'Details for p3' }
// ]
```

### Converting Between Sync and Async

You can easily switch between synchronous and asynchronous processing.

```typescript
import { Enumerable } from '@tstdl/base/enumerable';

const numbers = [1, 2, 3, 4, 5];

// Convert to async, perform async operations, then convert back to sync
const processedNumbers = await Enumerable.from(numbers)
  .toAsync()
  .parallelMap(2, true, async (n) => {
    await new Promise(resolve => setTimeout(resolve, 10)); // async work
    return n * 2;
  })
  .toSync();

console.log(processedNumbers.toArray()); // Output: [2, 4, 6, 8, 10]
```

## API Summary

Below is a summary of the main classes and some of their key methods.

### Class: `Enumerable<T>`

| Method | Arguments | Return Type | Description |
| :--- | :--- | :--- | :--- |
| `from(source)` | `source: Iterable<T>` | `Enumerable<T>` | Creates an `Enumerable` from a synchronous iterable. |
| `map(mapper)` | `mapper: (item: T) => TOut` | `Enumerable<TOut>` | Transforms each item in the sequence. |
| `filter(predicate)` | `predicate: (item: T) => boolean` | `Enumerable<T>` | Filters items based on a predicate. |
| `reduce(reducer, initialValue?)` | `reducer: (acc, item) => U`, `initialValue?: U` | `U` | Aggregates values into a single result. |
| `groupToMap(selector)` | `selector: (item: T) => TGroup` | `Map<TGroup, T[]>` | Groups items into a `Map` based on a key. |
| `sort(comparator?)` | `comparator?: (a: T, b: T) => number` | `Enumerable<T>` | Sorts the items. Returns a new enumerable. |
| `toArray()` | | `T[]` | Materializes the enumerable into an array. |
| `toAsync()` | | `AsyncEnumerable<T>` | Converts the `Enumerable` to an `AsyncEnumerable`. |

### Class: `AsyncEnumerable<T>`

| Method | Arguments | Return Type | Description |
| :--- | :--- | :--- | :--- |
| `from(source)` | `source: AnyIterable<T>` | `AsyncEnumerable<T>` | Creates an `AsyncEnumerable` from a sync or async iterable. |
| `map(mapper)` | `mapper: (item: T) => Promise<TOut> \| TOut` | `AsyncEnumerable<TOut>` | Transforms each item asynchronously. |
| `filter(predicate)` | `predicate: (item: T) => Promise<boolean> \| boolean` | `AsyncEnumerable<T>` | Filters items using an async predicate. |
| `parallelMap(concurrency, keepOrder, mapper)` | `concurrency: number`, `keepOrder: boolean`, `mapper: ...` | `AsyncEnumerable<TOut>` | Transforms items in parallel. |
| `reduce(reducer, initialValue?)` | `reducer: ...`, `initialValue?: U` | `Promise<U>` | Aggregates values asynchronously. |
| `toArray()` | | `Promise<T[]>` | Materializes the enumerable into an array. |
| `toSync()` | | `Promise<Enumerable<T>>` | Converts to `Enumerable` after all async operations complete. |