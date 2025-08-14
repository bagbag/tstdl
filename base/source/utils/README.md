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

interface User {
  id: number;
  name: string;
  active: boolean;
}

async function* getUsers(): AsyncIterable<User> {
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

| Function / Class | Arguments | Return Type | Description |
| :--- | :--- | :--- | :--- |
| `toArray<T>` | `value: T \| T[]` | `T[]` | Ensures `value` is an array. Wraps non-array values. |
| `distinct<T>` | `values: Iterable<T>`, `selector?: (item: T) => any` | `T[]` | Returns a new array with distinct values from an iterable. |
| `shuffle<T>` | `items: readonly T[]` | `T[]` | Returns a new, shuffled array using the Fisher-Yates algorithm. |
| `randomItem<T>` | `array: readonly T[]`, `options?: { min, max }` | `T` | Picks a single random item from an array. |
| `randomItems<T>` | `array: readonly T[]`, `count: number`, `allowDuplicates?: boolean` | `T[]` | Picks multiple random items from an array. |
| `createArray<T>` | `length: number`, `provider: (index) => T` | `T[]` | Creates an array of a specified length, with elements generated by a provider function. |
| `ArrayBacktracker<T>` | `array?: T[]` | `ArrayBacktracker<T>` | A class to track items added or removed from an array between updates. |

### Iterable & Async Iterable Helpers

Most functions are available in both synchronous (e.g., `map`) and asynchronous (`mapAsync`) versions. `AnyIterable<T>` refers to `Iterable<T> | AsyncIterable<T>`.

| Function | Arguments | Return Type | Description |
| :--- | :--- | :--- | :--- |
| `mapAsync<TIn, TOut>` | `iterable: AnyIterable<TIn>`, `mapper: (item, index) => TOut \| Promise<TOut>` | `AsyncIterableIterator<TOut>` | Transforms each item in an `AnyIterable` using an async `mapper` function. |
| `filterAsync<T>` | `iterable: AnyIterable<T>`, `predicate: (item, index) => boolean \| Promise<boolean>` | `AsyncIterableIterator<T>` | Filters items from an `AnyIterable` based on an async `predicate`. |
| `reduceAsync<T, U>` | `iterable: AnyIterable<T>`, `reducer: (acc, item, index) => U \| Promise<U>`, `initialValue?: U` | `Promise<U>` | Reduces an `AnyIterable` to a single value. |
| `toArrayAsync<T>` | `iterable: AnyIterable<T>` | `Promise<T[]>` | Converts an `AnyIterable` into an array. |
| `firstAsync<T>` | `iterable: AnyIterable<T>`, `predicate?: AsyncPredicate<T>` | `Promise<T>` | Returns the first item that satisfies a predicate, or throws if not found. |
| `firstOrDefaultAsync<T, D>` | `iterable: AnyIterable<T>`, `defaultValue: D`, `predicate?: AsyncPredicate<T>` | `Promise<T \| D>` | Returns the first item satisfying a predicate, or a default value. |
| `takeAsync<T>` | `iterable: AnyIterable<T>`, `count: number` | `AsyncIterableIterator<T>` | Takes the first `count` items from an `AnyIterable`. |
| `skipAsync<T>` | `iterable: AnyIterable<T>`, `count: number` | `AsyncIterableIterator<T>` | Skips the first `count` items from an `AnyIterable`. |
| `distinctAsync<T>` | `iterable: AnyIterable<T>`, `selector?: AsyncIteratorFunction<T, any>` | `AsyncIterableIterator<T>` | Returns an async iterable with distinct values. |
| `batchAsync<T>` | `iterable: AnyIterable<T>`, `size: number` | `AsyncIterableIterator<T[]>` | Batches items from an `AnyIterable` into arrays of a specified `size`. |
| `parallelMap` | `iterable, concurrency, keepOrder, mapper` | `AsyncIterable<TOut>` | Maps items in parallel with a specified `concurrency`. |
| `parallelFilter` | `iterable, concurrency, keepOrder, predicate` | `AsyncIterable<T>` | Filters items in parallel. |
| `parallelForEach` | `iterable, concurrency, func` | `Promise<void>` | Executes a function for each item in parallel. |

### Object Utilities

| Function | Arguments | Return Type | Description |
| :--- | :--- | :--- | :--- |
| `pick<T, K>` | `object: T`, `...keys: K[]` | `Pick<T, K>` | Creates a new object with only the specified keys. |
| `omit<T, K>` | `object: T`, `...keys: K[]` | `Omit<T, K>` | Creates a new object without the specified keys. |
| `mapObjectValues<T, V>` | `object: T`, `mapper: (value, key) => V` | `Record<keyof T, V>` | Creates a new object by applying a `mapper` to each value. |
| `mergeDeep<A, B>` | `a: A`, `b: B`, `options?: MergeDeepOptions` | `MergeDeep<A, B>` | Deeply merges two objects, with options for handling arrays. |
| `decycle<T>` | `value: T` | `Decycled<T>` | Replaces circular references with JSONPath strings for serialization. |
| `recycle<T>` | `value: Decycled<T>` | `T` | Restores an object processed with `decycle`. |
| `lazyProperty<T, K>` | `object: T`, `key: K`, `initializer: () => T[K]` | `void` | Defines a property on an object that is initialized on its first access. |
| `ForwardRef.create<T>` | `options?: ForwardRefOptions<T>` | `ForwardRef<T>` | Creates a forward reference proxy, useful for resolving circular dependencies. |
| `propertyNameOf<T>` | `expression: (instance: T) => any` | `string` | Type-safely gets the dot-notation path of a property. |
| `objectEntries<T>` | `object: T` | `[keyof T, T[keyof T]][]` | Returns an array of a given object's own enumerable string and symbol properties. |

### Type Guards & Assertions

A comprehensive set of type guards following the pattern: `isX`, `isNotX`, `assertX`, `assertNotX`, `assertXPass` (asserts and returns the value), and `assertNotXPass`.

| Function | Arguments | Return Type | Description |
| :--- | :--- | :--- | :--- |
| `isDefined` | `value: any` | `value is T` | Checks if a value is not `undefined` or `void`. |
| `isNotNull` | `value: any` | `value is T` | Checks if a value is not `null`. |
| `isString` | `value: any` | `value is string` | Checks if a value is a string. |
| `isNumber` | `value: any` | `value is number` | Checks if a value is a number (and not `NaN`). |
| `isArray` | `value: any` | `value is readonly any[]` | Checks if a value is an array. |
| `isObject` | `value: any` | `value is object` | Checks if a value is an object (but not `null`). |
| `assert` | `condition: boolean`, `message?: string` | `asserts condition` | Throws an `AssertionError` if the condition is false. |

### Cryptography & Encoding

| Function | Arguments | Return Type | Description |
| :--- | :--- | :--- | :--- |
| `digest` | `algorithm: HashAlgorithm`, `data: BinaryData \| string` | `DigestResult` | Computes a hash (`SHA-256`, etc.). Returns a result with `.toHex()`. |
| `encrypt` | `algorithm: CryptionAlgorithm`, `key: CryptoKey`, `data: BinaryData \| string` | `CryptionResult` | Encrypts data using a `CryptoKey`. |
| `decrypt` | `algorithm: CryptionAlgorithm`, `key: CryptoKey`, `data: BinaryData` | `DecryptionResult` | Decrypts data using a `CryptoKey`. |
| `sign` | `algorithm: SignAlgorithm`, `key: CryptoKey`, `data: BinaryData \| string` | `SignResult` | Creates a digital signature for data. |
| `verify` | `algorithm: SignAlgorithm`, `key: CryptoKey`, `signature`, `data` | `Promise<boolean>` | Verifies a digital signature. |
| `encodeBase64` | `data: BinaryData` | `string` | Encodes binary data to a Base64 string. |
| `decodeBase64` | `base64: string` | `Uint8Array` | Decodes a Base64 string to a `Uint8Array`. |
| `encodeHex` | `buffer: BinaryData` | `string` | Encodes binary data to a hexadecimal string. |
| `decodeHex` | `hex: string` | `Uint8Array` | Decodes a hexadecimal string to a `Uint8Array`. |

### Date & Time

| Function / Class | Arguments | Return Type | Description |
| :--- | :--- | :--- | :--- |
| `currentTimestamp` | `()` | `number` | Returns the current timestamp in milliseconds (`Date.now()`). |
| `toDateTime` | `input: DateTime \| Date \| number` | `DateTime` | Converts a `Date` or timestamp (ms) to a Luxon `DateTime` object. |
| `numericDateToDateObject` | `numericDate: number` | `DateObject` | Converts days since epoch to a `{ year, month, day }` object. |
| `dateObjectToNumericDate` | `dateObject: DateObject` | `number` | Converts a `{ year, month, day }` object to days since epoch. |
| `Timer` | `start?: boolean` | `Timer` | A high-resolution timer for performance measurements. |

### Stream Utilities

| Function | Arguments | Return Type | Description |
| :--- | :--- | :--- | :--- |
| `readBinaryStream` | `stream: ReadableStream`, `options?: ReadBinaryStreamOptions` | `Promise<Uint8Array>` | Reads an entire binary stream into a single `Uint8Array`. |
| `getReadableStreamFromIterable` | `iterable: AnyIterable<T>` | `ReadableStream<T>` | Creates a `ReadableStream` from an `Iterable` or `AsyncIterable`. |
| `finalizeStream` | `stream: ReadableStream`, `handlers` | `ReadableStream<T>` | Attaches finalizer handlers for `done`, `error`, and `cancel` events. |
| `toBytesStream` | `stream: ReadableStream` | `ReadableStream<Uint8Array>` | Converts a stream of `ArrayBufferView`s into a byte stream with BYOB support. |
| `sliceStream` | `stream`, `offset`, `length`, `type?` | `ReadableStream<T>` | Slices a stream by byte or chunk range without buffering the whole stream. |

### Function Utilities

| Function / Decorator | Arguments | Return Type | Description |
| :--- | :--- | :--- | :--- |
| `memoize` | `fn: Function` | `Function` | Memoizes a function, caching results based on parameters. |
| `@Memoize()` | - | `PropertyDecorator` | A decorator to memoize a class getter, caching the result per instance. |
| `throttleFunction` | `func: Function`, `interval: number` | `Function` | Creates a throttled function that invokes at most once per `interval`. |
| `asyncHook` | `()` | `AsyncHook` | Creates a hook to which async handlers can be registered and triggered. |

### Asynchronous Operations

| Function / Class | Arguments | Return Type | Description |
| :--- | :--- | :--- | :--- |
| `backoffLoop` | `loopFunction: BackoffLoopFunction`, `options?: BackoffLoopOptions` | `Promise<void>` | Runs a function in a loop with manual control over backoff and breaking. |
| `autoBackoffLoop` | `loopFunction`, `options?: AutoBackoffLoopOptions` | `Promise<void>` | A wrapper for `backoffLoop` that automatically backs off on errors. |
| `backoffGenerator` | `options?: BackoffGeneratorOptions` | `AsyncIterableIterator<...>` | An async generator for `for-await-of` loops with backoff control. |
| `timeout` | `milliseconds: number`, `options?: { abortSignal }` | `Promise<void>` | Returns a promise that resolves after a specified duration. |
| `withTimeout` | `ms: number`, `promiseOrProvider` | `Promise<T>` | Rejects with a `TimeoutError` if the promise doesn't resolve in time. |

### Miscellaneous

| Function | Arguments | Return Type | Description |
| :--- | :--- | :--- | :--- |
| `clone<T>` | `value: T`, `deep: boolean` | `T` | Clones a value. Uses `structuredClone` if available for deep clones. |
| `equals` | `a: any`, `b: any`, `options?: EqualsOptions` | `boolean` | Deeply compares two values for equality. |
| `enumValues<T>` | `enumeration: T` | `(T[keyof T])[]` | Gets all values of a TypeScript enum. |
| `getRandomString` | `length: number`, `alphabet?: string` | `string` | Generates a cryptographically secure random string. |
| `tryIgnore` | `fn: () => R`, `fallback?: F` | `R \| F` | Executes a function and returns a fallback value on error. |
| `buildUrl` | `url: string`, `parameters?: UrlBuilderParameters` | `UrlBuilderResult` | Compiles a URL template string (e.g., `/users/:id`) with parameters. |
| `_throw` | `error: any` | `never` | A utility function that throws an error, useful in expressions. |
| `composeMiddleware` | `middlewares: Middleware[]` | `ComposedMiddleware` | Composes multiple middleware functions into a single function. |
