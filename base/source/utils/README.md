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
  - [Miscellaneous](#miscellaneous)

## Features

- **Comprehensive Toolset**: A wide range of utilities covering data manipulation, asynchronous operations, cryptography, and more.
- **Tree-Shakeable**: Designed with modern bundlers in mind. Only the code you use is included in your final bundle.
- **TypeScript First**: Written entirely in TypeScript with strong type safety and excellent autocompletion.
- **Iterable-First Approach**: Powerful helpers for both synchronous and asynchronous iterables, promoting a functional and memory-efficient style of programming.
- **Parallel Processing**: Built-in support for parallelizing iterable operations like `map`, `filter`, and `forEach`.
- **Robust Type Guards**: A rich set of type guards and assertion functions to write safer, more predictable code.
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

`@tstdl/base/utils` is built with TypeScript at its core. It provides a comprehensive set of type guards (e.g., `isString`, `isDefined`) and assertion functions (e.g., `assertString`, `assertDefined`) that help you validate data and narrow types, leading to more robust and error-free code.

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
    filterAsync(getUsers(), user => user.active),
    user => user.name
  )
);

console.log(activeUserNames); // ['Alice', 'Charlie']
```

### Object Utilities

Manipulate objects with ease.

```typescript
import { mapObjectValues, pick } from '@tstdl/base/utils';

const user = {
  id: 1,
  name: 'Alice',
  email: 'alice@example.com',
  createdAt: new Date()
};

const publicProfile = pick(user, 'id', 'name');
// { id: 1, name: 'Alice' }

const formattedUser = mapObjectValues(user, (value, key) =>
  (key === 'createdAt' && value instanceof Date) ? value.toISOString() : value
);
// { id: 1, name: 'Alice', email: 'alice@example.com', createdAt: '2023-...' }
```

### Type Guards and Assertions

Write safer and more predictable code.

```typescript
import { isDefined, assertString } from '@tstdl/base/utils';

function processInput(input: string | number | undefined): string {
  if (!isDefined(input)) {
    throw new Error('Input is not defined');
  }

  // `input` is now `string | number`

  assertString(input, 'Input must be a string');

  // `input` is now `string`
  return input.toUpperCase();
}
```

### Cryptography

Perform common cryptographic operations.

```typescript
import { digest } from '@tstdl/base/utils';

const data = 'Hello, world!';
const hash = await digest('SHA-256', data).toHex();

console.log(hash); // 315f5bdb76d078c43b8ac0064e4a0164612b1fce77c869345bfc94c75894edd3
```

## API Summary

This is a curated list of some of the most common utilities. The library contains many more functions than listed here.

### Array Utilities

- `toArray<T>(value: T | T[]): T[]`: Ensures a value is an array.
- `distinct<T>(values: Iterable<T>, selector?: (item: T) => any): T[]`: Returns an array with distinct values.
- `shuffle<T>(items: readonly T[]): T[]`: Returns a shuffled copy of an array.
- `randomItem<T>(array: readonly T[]): T`: Picks a random item from an array.
- `ArrayBacktracker<T>`: A class to track additions and removals from an array over time.

### Iterable & Async Iterable Helpers

A rich set of over 40 functions for processing iterables. Both synchronous and asynchronous versions are available (e.g., `map` and `mapAsync`).

- `mapAsync<TIn, TOut>(iterable: AnyIterable<TIn>, mapper: (item: TIn, index: number) => TOut | Promise<TOut>): AsyncIterableIterator<TOut>`: Maps each item to a new value.
- `filterAsync<T>(iterable: AnyIterable<T>, predicate: (item: T, index: number) => boolean | Promise<boolean>): AsyncIterableIterator<T>`: Filters items based on a predicate.
- `reduceAsync<T, U>(iterable: AnyIterable<T>, reducer: (prev: U, current: T) => U | Promise<U>, initialValue: U): Promise<U>`: Reduces an iterable to a single value.
- `toArrayAsync<T>(iterable: AnyIterable<T>): Promise<T[]>`: Converts an iterable to an array.
- `parallelMap<TIn, TOut>(iterable: AnyIterable<TIn>, concurrency: number, keepOrder: boolean, mapper: (item: TIn) => Promise<TOut>): AsyncIterable<TOut>`: Maps items in parallel.
- `parallelFilter<T>(iterable: AnyIterable<T>, concurrency: number, keepOrder: boolean, predicate: (item: T) => Promise<boolean>): AsyncIterable<T>`: Filters items in parallel.

### Object Utilities

- `objectEntries<T>(object: T): [keyof T, T[keyof T]][]`: Gets entries of an object, including symbol keys.
- `pick<T, K extends keyof T>(object: T, ...keys: K[]): Pick<T, K>`: Creates a new object with only the specified keys.
- `omit<T, K extends keyof T>(object: T, ...keys: K[]): Omit<T, K>`: Creates a new object without the specified keys.
- `mergeDeep<A, B>(a: A, b: B): MergeDeep<A, B>`: Deeply merges two objects.
- `decycle<T>(value: T): any`: Replaces circular references in an object with JSONPath strings.
- `recycle<T>(value: any): T`: Restores circular references from JSONPath strings.
- `lazyProperty<T, K>(object: T, key: K, initializer: () => T[K])`: Defines a property on an object that is initialized on first access.
- `ForwardRef`: A utility for creating and managing forward references, useful for resolving circular dependencies.

### Type Guards & Assertions

For every `isX` function, corresponding `isNotX`, `assertX`, `assertNotX`, `assertXPass`, and `assertNotXPass` functions are also available.

- `isString(value: any): value is string`
- `isNumber(value: any): value is number`
- `isArray(value: any): value is readonly any[]`
- `isObject(value: any): value is object`
- `isFunction(value: any): value is Function`
- `isDefined(value: any): value is Exclude<typeof value, undefined | void>`
- `isNullOrUndefined(value: any): value is null | undefined`

### Cryptography & Encoding

- `digest(algorithm: HashAlgorithmIdentifier, data: BinaryData | string): DigestResult`: Computes a hash of the data.
- `encrypt(algorithm: CryptionAlgorithm, key: CryptoKey, data: BinaryData | string): CryptionResult`: Encrypts data.
- `decrypt(algorithm: CryptionAlgorithm, key: CryptoKey, data: BinaryData): DecryptionResult`: Decrypts data.
- `sign(algorithm: SignAlgorithm, key: CryptoKey, data: BinaryData | string): SignResult`: Signs data.
- `verify(algorithm: SignAlgorithm, key: CryptoKey, signature: BinaryData, data: BinaryData): Promise<boolean>`: Verifies a signature.
- `encodeBase64(data: BinaryData): string`: Encodes binary data to a Base64 string.
- `decodeBase64(base64: string): Uint8Array`: Decodes a Base64 string to binary data.
- `encodeHex(buffer: BinaryData): string`: Encodes binary data to a hexadecimal string.
- `decodeHex(hex: string): Uint8Array`: Decodes a hexadecimal string to binary data.

### Date & Time

- `currentTimestamp(): number`: Returns the current timestamp in milliseconds.
- `toDateTime(input: Date | number): DateTime`: Converts a Date or timestamp to a Luxon `DateTime` object.
- `numericDateToDateObject(numericDate: number): DateObject`: Converts a numeric date (days since epoch) to a `{ year, month, day }` object.
- `timeout(milliseconds: number): Promise<void>`: Waits for a specified duration.
- `withTimeout<T>(milliseconds: number, promise: Promise<T>): Promise<T>`: Wraps a promise with a timeout.
- `Timer`: A high-resolution timer class for performance measurements.

### Stream Utilities

- `readBinaryStream(stream: ReadableStream<ArrayBufferView>, options?: object): Promise<Uint8Array>`: Reads an entire binary stream into a single `Uint8Array`.
- `getReadableStreamFromIterable<T>(iterable: AnyIterable<T>): ReadableStream<T>`: Creates a `ReadableStream` from an iterable or async iterable.
- `finalizeStream(stream: ReadableStream, handlers: object): ReadableStream`: Attaches finalizer handlers to a stream for `done`, `error`, and `cancel` events.
- `toBytesStream(stream: ReadableStream<ArrayBufferView>): ReadableStream<Uint8Array>`: Converts a stream of `ArrayBufferView`s into a byte stream (`ReadableStream<Uint8Array>`).

### Function Utilities

- `memoize<Fn>(fn: Fn): Fn`: Memoizes a function with any number of arguments.
- `memoizeSingle<Fn>(fn: Fn): Fn`: A faster memoization for functions with a single argument.
- `@Memoize()`: A decorator to memoize a class getter.
- `throttleFunction<A, R>(func: (...A) => R, interval: number): (...A) => R | symbol`: Creates a throttled version of a function.

### Miscellaneous

- `enumValues<T>(enumeration: T): (T[keyof T])[]`: Gets all values of a TypeScript enum.
- `getRandomBytes(count: number): Uint8Array`: Generates cryptographically secure random bytes.
- `clone<T>(value: T, deep: boolean): T`: Clones a value, with support for deep cloning.
- `equals(a: any, b: any, options?: object): boolean`: Deeply compares two values for equality.
- `tryIgnore<R, F>(fn: () => R, fallback: F): R | F`: Executes a function and returns a fallback value on error.
- `buildUrl(url: string, parameters: object): object`: Compiles a URL template string with parameters (e.g., `/users/:id`).