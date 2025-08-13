# @tstdl/base/utils

A comprehensive, modern, and tree-shakeable utility library for TypeScript, providing a rich set of tools for common programming tasks. It includes helpers for arrays, iterables (sync and async), objects, streams, cryptography, and more.

## Table of Contents

- [Features](#features)
- [Core Concepts](#core-concepts)
- [Usage](#usage)
- [API Summary](#api-summary)
  - [Array Utilities](#array-utilities)
  - [Iterable & Async Iterable Helpers](#iterable--async-iterable-helpers)
  - [Object Utilities](#object-utilities)
  - [Type Guards & Assertions](#type-guards--assertions)
  - [Cryptography & Encoding](#cryptography--encoding)
  - [Date & Time](#date--time)
  - [Stream Utilities](#stream-utilities)
  - [Function Utilities](#function-utilities)
  - [Asynchronous Operations](#asynchronous-operations)
  - [Miscellaneous](#miscellaneous)

## Features

- **Comprehensive Toolset**: A wide range of utilities covering data manipulation, asynchronous operations, cryptography, and more.
- **Tree-Shakeable**: Designed with modern bundlers in mind. Only the code you use is included in your final bundle.
- **TypeScript First**: Written entirely in TypeScript with strong type safety and excellent autocompletion.
- **Iterable-First Approach**: Powerful helpers for both synchronous and asynchronous iterables, promoting a functional and memory-efficient style of programming.
- **Parallel Processing**: Built-in support for parallelizing iterable operations like `map`, `filter`, and `forEach` to leverage multi-core environments.
- **Robust Type Guards**: A rich set of type guards (e.g., `isString`, `isDefined`) and assertion functions (e.g., `assertString`, `assertDefinedPass`) to write safer, more predictable code.
- **Advanced Async Utilities**: Helpers for backoff strategies, async hooks, and stream manipulation.
- **Zero Dependencies**: A lightweight library with no external dependencies.

## Core Concepts

### Modularity and Tree-Shakeability

The library is structured into small, focused modules. Each utility function is typically in its own file and exported from the main entry point. This design allows build tools like Webpack or Rollup to perform tree-shaking effectively, ensuring that only the functions you actually import are included in your application's final bundle.

```typescript
// Only `mapAsync` and `toArrayAsync` will be included in your bundle.
import { mapAsync, toArrayAsync } from '@tstdl/base/utils';
```

### Iterable-First Approach

A significant portion of the library is dedicated to manipulating collections of data through iterables and async iterables. This approach offers several advantages:

- **Memory Efficiency**: Data is processed one item at a time, avoiding the need to load entire datasets into memory.
- **Composability**: Helper functions can be chained together to create complex data processing pipelines in a clean, declarative way.
- **Versatility**: Works seamlessly with native JavaScript collections (Arrays, Maps, Sets), generators, and any object that implements the iterable or async iterable protocol.

### Type Safety

`@tstdl/base/utils` is built with TypeScript at its core. It provides a comprehensive set of type guards and assertion functions that help you validate data and narrow types, leading to more robust and error-free code.

## Usage

### Async Iterable Helpers

Process data streams or asynchronous collections efficiently.

```typescript
import { filterAsync, mapAsync, toArrayAsync } from '@tstdl/base/utils';

async function* getUsers() {
  yield { id: 1, name: 'Alice', active: true };
  yield { id: 2, name: 'Bob', active: false };
  yield { id: 3, name: 'Charlie', active: true };
}

const activeUserNames = await toArrayAsync(
  mapAsync(
    filterAsync(getUsers(), (user) => user.active),
    (user) => user.name,
  ),
);

console.log(activeUserNames); // ['Alice', 'Charlie']
```

### Parallel Processing

Speed up data processing by running operations in parallel.

```typescript
import { parallelMap, toArrayAsync, range } from '@tstdl/base/utils';

async function processItem(item: number): Promise<string> {
  // Simulate an async operation
  await new Promise((resolve) => setTimeout(resolve, 10));
  return `Processed ${item}`;
}

// Process 100 items with a concurrency of 10
const results = await toArrayAsync(parallelMap(range(1, 100), 10, true, (item) => processItem(item)));

console.log(results.length); // 100
```

### Type Guards and Assertions

Write safer and more predictable code.

```typescript
import { isDefined, assertStringPass } from '@tstdl/base/utils';

function processInput(input: string | number | undefined): string {
  const definedInput = assertDefinedPass(input, 'Input is not defined');
  // `definedInput` is now `string | number`

  const stringInput = assertStringPass(definedInput, 'Input must be a string');
  // `stringInput` is now `string`

  return stringInput.toUpperCase();
}
```

### Object Utilities

Get type-safe property names for refactoring and avoiding magic strings.

```typescript
import { propertyNameOf } from '@tstdl/base/utils';

interface User {
  id: number;
  profile: {
    name: string;
    email: string;
  };
}

const namePath = propertyNameOf<User>((u) => u.profile.name);

console.log(namePath); // 'profile.name'
```

### Backoff Helper

Implement retry logic with backoff strategies.

```typescript
import { backoffLoop } from '@tstdl/base/utils';

let attempts = 0;
async function unreliableOperation(): Promise<boolean> {
  attempts++;
  console.log(`Attempt ${attempts}...`);
  return Math.random() > 0.8; // 20% success rate
}

await backoffLoop(async (controller) => {
  const success = await unreliableOperation();

  if (success) {
    console.log(`Succeeded after ${attempts} attempts.`);
    controller.break();
  } else {
    console.log('Failed, backing off...');
    controller.backoff();
  }
});
```

## API Summary

This is a curated list of the most common utilities. The library contains many more functions than listed here.

### Array Utilities

| Function / Class                            | Description                                                                                                                                               |
| :------------------------------------------ | :-------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `toArray<T>(value)`                         | Ensures `value` is an array. If `value` is already an array, it's returned as is; otherwise, it's wrapped in a new array.                                 |
| `distinct<T>(values, selector?)`            | Returns a new array containing only the distinct values from the input iterable. An optional `selector` function can be provided to determine uniqueness. |
| `shuffle<T>(items)`                         | Returns a new array with the elements of `items` shuffled using the Fisher-Yates algorithm.                                                               |
| `randomItem<T>(array)`                      | Picks a single random item from an array.                                                                                                                 |
| `randomItems<T>(array, count, duplicates?)` | Picks multiple random items from an array.                                                                                                                |
| `createArray<T>(length, provider)`          | Creates an array of a specified `length`, with each element generated by the `provider` function.                                                         |
| `ArrayBacktracker<T>`                       | A class to track items that have been added or removed from an array between updates.                                                                     |

### Iterable & Async Iterable Helpers

Most functions are available in both synchronous (e.g., `map`) and asynchronous (e.g., `mapAsync`) versions. The term `AnyIterable` refers to `Iterable<T> | AsyncIterable<T>`.

| Function                                           | Description                                                                                         |
| :------------------------------------------------- | :-------------------------------------------------------------------------------------------------- |
| `mapAsync<TIn, TOut>(iterable, mapper)`            | Transforms each item in an `AnyIterable` using an async `mapper` function.                          |
| `filterAsync<T>(iterable, predicate)`              | Filters items from an `AnyIterable` based on an async `predicate` function.                         |
| `reduceAsync<T, U>(iterable, reducer, initial?)`   | Reduces an `AnyIterable` to a single value using an async `reducer` function.                       |
| `toArrayAsync<T>(iterable)`                        | Converts an `AnyIterable` into an array.                                                            |
| `firstAsync<T>(iterable, predicate?)`              | Returns the first item that satisfies an optional async `predicate`, or throws if none is found.    |
| `firstOrDefaultAsync<T, D>(iterable, default, p?)` | Returns the first item that satisfies an optional async `predicate`, or `default` if none is found. |
| `takeAsync<T>(iterable, count)`                    | Takes the first `count` items from an `AnyIterable`.                                                |
| `skipAsync<T>(iterable, count)`                    | Skips the first `count` items from an `AnyIterable`.                                                |
| `distinctAsync<T>(iterable, selector?)`            | Returns an async iterable with distinct values based on an optional async `selector`.               |
| `batchAsync<T>(iterable, size)`                    | Batches items from an `AnyIterable` into arrays of a specified `size`.                              |

#### Parallel Helpers

| Function                                                       | Description                                                                                                          |
| :------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------- |
| `parallelMap<TIn, TOut>(iterable, concurrency, order, mapper)` | Maps items in parallel with a specified `concurrency`. `keepOrder` ensures the output order matches the input order. |
| `parallelFilter<T>(iterable, concurrency, order, predicate)`   | Filters items in parallel.                                                                                           |
| `parallelForEach<T>(iterable, concurrency, func)`              | Executes a function for each item in parallel.                                                                       |

### Object Utilities

| Function                                       | Description                                                                              |
| :--------------------------------------------- | :--------------------------------------------------------------------------------------- |
| `pick<T, K>(object, ...keys)`                  | Creates a new object with only the specified keys from the source object.                |
| `omit<T, K>(object, ...keys)`                  | Creates a new object without the specified keys from the source object.                  |
| `mapObjectValues<T, V>(object, mapper)`        | Creates a new object by applying a `mapper` function to each value of the source object. |
| `mergeDeep<A, B>(a, b, options?)`              | Deeply merges two objects, with options for handling arrays.                             |
| `decycle<T>(value)`                            | Replaces circular references in an object with JSONPath strings to make it serializable. |
| `recycle<T>(value)`                            | Restores an object that was processed with `decycle`.                                    |
| `lazyProperty<T, K>(object, key, initializer)` | Defines a property on an object that is initialized on its first access.                 |
| `ForwardRef.create<T>()`                       | Creates a forward reference proxy object, useful for resolving circular dependencies.    |
| `propertyNameOf<T>(expression)`                | Type-safely gets the dot-notation path of a property from a nested object structure.     |

### Type Guards & Assertions

A comprehensive set of type guards following a consistent naming pattern. For each `isX` function, there are corresponding `isNotX`, `assertX`, `assertNotX`, `assertXPass`, and `assertNotXPass` functions.

| Function                      | Description                                           |
| :---------------------------- | :---------------------------------------------------- |
| `isDefined(value)`            | Checks if a value is not `undefined` or `void`.       |
| `isNotNull(value)`            | Checks if a value is not `null`.                      |
| `isString(value)`             | Checks if a value is a string.                        |
| `isNumber(value)`             | Checks if a value is a number (and not `NaN`).        |
| `isArray(value)`              | Checks if a value is an array.                        |
| `isObject(value)`             | Checks if a value is an object (but not `null`).      |
| `isFunction(value)`           | Checks if a value is a function.                      |
| `isPromise(value)`            | Checks if a value is a `Promise`.                     |
| `isReadableStream(value)`     | Checks if a value is a `ReadableStream`.              |
| `assert(condition, message?)` | Throws an `AssertionError` if the condition is false. |

### Cryptography & Encoding

| Function                                  | Description                                                                                                    |
| :---------------------------------------- | :------------------------------------------------------------------------------------------------------------- |
| `digest(algorithm, data)`                 | Computes a hash (`SHA-1`, `SHA-256`, etc.) of the data. Returns a `DigestResult` with methods like `.toHex()`. |
| `encrypt(algorithm, key, data)`           | Encrypts data using a `CryptoKey`.                                                                             |
| `decrypt(algorithm, key, data)`           | Decrypts data using a `CryptoKey`.                                                                             |
| `sign(algorithm, key, data)`              | Creates a digital signature for data.                                                                          |
| `verify(algorithm, key, signature, data)` | Verifies a digital signature.                                                                                  |
| `encodeBase64(data)`                      | Encodes binary data to a Base64 string.                                                                        |
| `decodeBase64(base64)`                    | Decodes a Base64 string to a `Uint8Array`.                                                                     |
| `encodeHex(buffer)`                       | Encodes binary data to a hexadecimal string.                                                                   |
| `decodeHex(hex)`                          | Decodes a hexadecimal string to a `Uint8Array`.                                                                |

### Date & Time

| Function / Class                       | Description                                                                                              |
| :------------------------------------- | :------------------------------------------------------------------------------------------------------- |
| `currentTimestamp()`                   | Returns the current timestamp in milliseconds (`Date.now()`).                                            |
| `toDateTime(input)`                    | Converts a `Date` or timestamp (ms) to a Luxon `DateTime` object.                                        |
| `numericDateToDateObject(numericDate)` | Converts a numeric date (days since epoch) to a `{ year, month, day }` object.                           |
| `dateObjectToNumericDate(dateObject)`  | Converts a `{ year, month, day }` object to a numeric date.                                              |
| `Timer`                                | A high-resolution timer class for performance measurements, using `process.hrtime` or `performance.now`. |

### Stream Utilities

| Function                                     | Description                                                                                                  |
| :------------------------------------------- | :----------------------------------------------------------------------------------------------------------- |
| `readBinaryStream(stream, options?)`         | Reads an entire binary stream into a single `Uint8Array`.                                                    |
| `getReadableStreamFromIterable<T>(iterable)` | Creates a `ReadableStream` from an `Iterable` or `AsyncIterable`.                                            |
| `finalizeStream(stream, handlers)`           | Attaches finalizer handlers to a stream for `done`, `error`, and `cancel` events.                            |
| `toBytesStream(stream)`                      | Converts a stream of `ArrayBufferView`s into a byte stream (`ReadableStream<Uint8Array>`) with BYOB support. |
| `sliceStream(stream, offset, length)`        | Slices a `ReadableStream` by a byte or chunk range without buffering the whole stream.                       |

### Function Utilities

| Function / Decorator               | Description                                                                                     |
| :--------------------------------- | :---------------------------------------------------------------------------------------------- |
| `memoize(fn)`                      | Memoizes a function with any number of arguments, caching results based on parameters.          |
| `memoizeSingle(fn)`                | A faster version of `memoize` for functions with a single argument.                             |
| `@Memoize()`                       | A decorator to memoize a class getter. The result is cached per instance.                       |
| `throttleFunction(func, interval)` | Creates a throttled version of a function that only invokes `func` at most once per `interval`. |

### Asynchronous Operations

| Function / Class                          | Description                                                                                              |
| :---------------------------------------- | :------------------------------------------------------------------------------------------------------- |
| `backoffLoop(loopFunction, options?)`     | Runs a function in a loop with manual control over backoff and breaking.                                 |
| `autoBackoffLoop(loopFunction, options?)` | A wrapper for `backoffLoop` that automatically backs off on errors.                                      |
| `backoffGenerator(options?)`              | An async generator that yields a callback to trigger a backoff, useful in `for-await-of` loops.          |
| `timeout(milliseconds)`                   | Returns a promise that resolves after a specified duration.                                              |
| `withTimeout<T>(ms, promise)`             | Wraps a promise, causing it to reject with a `TimeoutError` if it doesn't resolve within the given time. |
| `asyncHook<T, C, R>()`                    | Creates a hook to which async handlers can be registered and triggered sequentially.                     |

### Miscellaneous

| Function                             | Description                                                                                                  |
| :----------------------------------- | :----------------------------------------------------------------------------------------------------------- |
| `clone<T>(value, deep)`              | Clones a value. Uses `structuredClone` if available for deep clones.                                         |
| `equals(a, b, options?)`             | Deeply compares two values for equality.                                                                     |
| `enumValues<T>(enumeration)`         | Gets all values of a TypeScript enum.                                                                        |
| `getRandomBytes(count)`              | Generates cryptographically secure random bytes using `crypto.getRandomValues`.                              |
| `getRandomString(length, alphabet?)` | Generates a cryptographically secure random string.                                                          |
| `tryIgnore(fn, fallback?)`           | Executes a function and returns a fallback value on error. `tryIgnoreAsync` is also available.               |
| `buildUrl(url, parameters)`          | Compiles a URL template string (e.g., `/users/:id`) with parameters.                                         |
| `_throw(error)`                      | A utility function that throws an error, useful in expressions like the ternary operator or arrow functions. |
