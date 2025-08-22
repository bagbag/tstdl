# Advanced Promises

This module provides a set of advanced Promise implementations for handling more complex asynchronous scenarios, such as cancellation, deferred resolution, and lazy execution.

## Table of Contents

- [Features](#features)
- [Core Concepts](#core-concepts)
  - [DeferredPromise](#deferredpromise)
  - [CancelablePromise](#cancelablepromise)
  - [LazyPromise](#lazypromise)
- [Usage](#usage)
  - [DeferredPromise](#deferredpromise-1)
  - [CancelablePromise](#cancelablepromise-1)
  - [LazyPromise](#lazypromise-1)
- [API Summary](#api-summary)

## Features

- **Deferred Resolution**: Control promise resolution and rejection from outside the executor function with `DeferredPromise`.
- **Cancellable Operations**: Create promises for long-running operations that can be gracefully canceled using `CancelablePromise`.
- **Lazy Execution**: Defer the execution of a promise's logic until it is actually awaited with `LazyPromise`.

## Core Concepts

This module extends the standard `Promise` functionality to cover common patterns that are cumbersome to implement manually.

### DeferredPromise

A `DeferredPromise` decouples the promise's creation from its resolution or rejection. This is useful in scenarios where one part of your code needs to wait for a signal or event triggered by another, unrelated part. You can create the promise, pass it around, and then call `resolve()` or `reject()` on it later when the condition is met. It also supports being `reset()` to a pending state to be awaited again.

### CancelablePromise

A `CancelablePromise` wraps an asynchronous operation and exposes a `cancel()` method. When awaited, it resolves to an object indicating whether the operation completed successfully (`{ canceled: false, value: T }`) or was canceled (`{ canceled: true, reason: R }`). The executor function receives a `cancellationSignal` that can be used to stop the ongoing work prematurely.

### LazyPromise

A `LazyPromise` defers the execution of its executor function until `.then()`, `.catch()`, or `.finally()` is called on it (or it is `await`ed). This is ideal for deferring resource-intensive operations, like network requests or file I/O, until the result is actually needed, preventing unnecessary work.

## Usage

### DeferredPromise

A `DeferredPromise` is useful when you need to resolve a promise from outside its initial scope.

**Basic Usage**

```typescript
import { DeferredPromise } from '@tstdl/base/promise';
import { CancellationToken } from '@tstdl/base/cancellation';
import { cancelableTimeout } from '@tstdl/base/utils';

// Somewhere in your application, a signal is created
const readySignal = new DeferredPromise<void>();

async function waitForReady() {
  console.log('Waiting for the system to be ready...');
  await readySignal;
  console.log('System is ready!');
}

async function initializeSystem() {
  await cancelableTimeout(1000, CancellationToken.None); // Simulate work
  console.log('System initialized, resolving signal.');
  readySignal.resolve();
}

waitForReady();
initializeSystem();

// Output:
// Waiting for the system to be ready...
// System initialized, resolving signal.
// System is ready!
```

**Resetting a DeferredPromise**

You can reset a `DeferredPromise` to its pending state to be awaited again.

```typescript
import { DeferredPromise } from '@tstdl/base/promise';

const promise = new DeferredPromise<string>();

async function run() {
  promise.resolve('First resolution');
  const result1 = await promise;
  console.log(result1); // 'First resolution'

  promise.reset();

  promise.resolve('Second resolution');
  const result2 = await promise;
  console.log(result2); // 'Second resolution'
}

run();
```

### CancelablePromise

A `CancelablePromise` is perfect for operations that might need to be aborted.

```typescript
import { CancelablePromise } from '@tstdl/base/promise';
import { CancellationToken } from '@tstdl/base/cancellation';
import { cancelableTimeout } from '@tstdl/base/utils';

async function fetchUserData(id: string, cancellationSignal: CancellationToken): Promise<{ id: string, name: string }> {
  console.log(`Fetching data for user ${id}...`);
  await cancelableTimeout(2000, cancellationSignal); // Simulate a network request
  return { id, name: 'John Doe' };
}

const promise = new CancelablePromise<Awaited<ReturnType<typeof fetchUserData>>, string>(
  (resolve, reject, cancellationSignal) => {
    fetchUserData('123', cancellationSignal)
      .then(resolve)
      .catch(reject);
  }
);

// Example 1: Operation completes successfully
async function runSuccessful() {
  const result = await promise;

  if (result.canceled) {
    console.log(`Operation was canceled with reason: ${result.reason}`);
  } else {
    console.log('User data fetched:', result.value);
  }
}

// runSuccessful();
// Output:
// Fetching data for user 123...
// User data fetched: { id: '123', name: 'John Doe' }

// Example 2: Operation is canceled
async function runCanceled() {
  setTimeout(() => {
    console.log('Canceling fetch operation...');
    promise.cancel('User navigated away');
  }, 500);

  const result = await promise;

  if (result.canceled) {
    console.log(`Operation was canceled with reason: ${result.reason}`);
  } else {
    console.log('User data fetched:', result.value);
  }
}

runCanceled();
// Output:
// Fetching data for user 123...
// Canceling fetch operation...
// Operation was canceled with reason: User navigated away
```

### LazyPromise

A `LazyPromise` delays execution until the result is consumed.

```typescript
import { LazyPromise } from '@tstdl/base/promise';
import { CancellationToken } from '@tstdl/base/cancellation';
import { cancelableTimeout } from '@tstdl/base/utils';

console.log('Creating LazyPromise...');
const lazyPromise = new LazyPromise<string>(async (resolve) => {
  console.log('LazyPromise executor is now running!');
  await cancelableTimeout(500, CancellationToken.None);
  resolve('Lazy data is ready.');
});

async function consumeLazy() {
  console.log('About to await the LazyPromise...');
  const result = await lazyPromise;
  console.log(result);
}

console.log('Script started.');
consumeLazy();
console.log('consumeLazy() called, but executor has not run yet.');

// Output:
// Creating LazyPromise...
// Script started.
// About to await the LazyPromise...
// consumeLazy() called, but executor has not run yet.
// LazyPromise executor is now running!
// Lazy data is ready.
```

## API Summary

| Class/Function | Signature | Return Type | Description |
| :--- | :--- | :--- | :--- |
| **`DeferredPromise<T>`** | `new <T>(executor?: PromiseExecutor<T>)` | `DeferredPromise<T>` | Creates a new deferred promise. |
| | `resolve(value: T)` | `void` | Resolves the promise with a value. Throws if not pending. |
| | `resolveIfPending(value: T)` | `void` | Resolves the promise only if it is in a pending state. |
| | `reject(reason?: any)` | `void` | Rejects the promise with a reason. Throws if not pending. |
| | `reset()` | `void` | Resets the promise to a pending state if it was settled. |
| **`CancelablePromise<T, R>`** | `new <T, R>(executor: CancelablePromiseExecutor<T>)` | `CancelablePromise<T, R>` | Creates a new cancelable promise. |
| | `cancel(reason: R)` | `void` | Cancels the promise, causing it to resolve with a `canceled: true` result. |
| **`LazyPromise<T>`** | `new <T>(executor: PromiseExecutor<T>)` | `LazyPromise<T>` | Creates a new lazy promise. The executor runs only when awaited. |