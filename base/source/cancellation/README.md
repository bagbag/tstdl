# Cancellation Signal (`@tstdl/cancellation`)

A powerful and flexible cancellation signaling module for TypeScript, built on RxJS. It provides a robust mechanism for managing cancellation in asynchronous operations, offering seamless integration with Promises, Observables, and the native `AbortSignal`.

## Table of Contents

- [Features](#features)
- [Core Concepts](#core-concepts)
- [Usage](#usage)
  - [Basic Usage](#basic-usage)
  - [Promise-like Behavior](#promise-like-behavior)
  - [Reactive Programming with RxJS](#reactive-programming-with-rxjs)
  - [Creating a Child Token](#creating-a-child-token)
  - [Interoperability with `AbortSignal`](#interoperability-with-abortsignal)
  - [Creating from other Sources](#creating-from-other-sources)
  - [Connecting Tokens](#connecting-tokens)
  - [Error Handling and Completion](#error-handling-and-completion)
- [API Summary](#api-summary)

## Features

- **Reactive:** Built on top of RxJS `BehaviorSubject` for powerful state management.
- **Promise-like:** `await` a signal to pause execution until it's cancelled.
- **Hierarchical:** Create child tokens that inherit cancellation state from parents.
- **Interoperable:** Seamlessly convert to and from the native `AbortSignal`.
- **Flexible:** Create signals from Promises, Observables, or AbortSignals.
- **Explicit Read/Write Separation:** Use `CancellationToken` to control state and `CancellationSignal` for a read-only view.

## Core Concepts

The module revolves around two main classes:

-   **`CancellationToken`**: The writable part of the signal. It allows you to control the cancellation state by calling methods like `.set()`, `.unset()`, `.error()`, and `.complete()`. It also serves as a factory for creating child tokens.
-   **`CancellationSignal`**: A read-only view of a `CancellationToken`. It exposes the cancellation state (`isSet`, `isUnset`), a promise-like `then()` method, and RxJS observables (`set$`, `unset$`) without allowing modification. This is useful for passing into functions that should only react to cancellation, not trigger it.

A `CancellationToken` *is a* `CancellationSignal`, but it has additional methods to change the state. You can get a dedicated read-only `CancellationSignal` from a `CancellationToken` via its `.signal` property.

The state of a token can be:
-   **Unset** (`isUnset` is true): The default state, indicating that the operation should continue.
-   **Set** (`isSet` is true): The cancelled state, indicating that the operation should stop.

## Usage

### Basic Usage

Create a `CancellationToken` to manage the lifecycle of an operation.

```typescript
import { CancellationToken } from '@tstdl/cancellation';

const token = new CancellationToken();

console.log(token.isSet); // false
console.log(token.isUnset); // true

// Some time later...
token.set(); // Set the token to a cancelled state

console.log(token.isSet); // true
console.log(token.isUnset); // false
```

### Promise-like Behavior

You can `await` a `CancellationSignal` or `CancellationToken`. The promise resolves when the token is set (cancelled). This is useful for pausing execution or using with `Promise.race`.

```typescript
import { CancellationToken } from '@tstdl/cancellation';
import { timeout } from '@tstdl/promise';

async function longRunningTask(cancellationSignal: CancellationSignal) {
  console.log('Task started.');
  
  try {
    // Wait for either the task to finish or cancellation to be requested
    await Promise.race([timeout(5000), cancellationSignal]);
  }
  catch (e) {
    // Handle potential errors from the task itself
  }

  if (cancellationSignal.isSet) {
    console.log('Task was cancelled.');
    return;
  }

  console.log('Task finished successfully.');
}

const token = new CancellationToken();
longRunningTask(token.signal); // Pass the read-only signal

// Cancel the task after 2 seconds
setTimeout(() => token.set(), 2000);

// Expected output:
// Task started.
// Task was cancelled.
```

### Reactive Programming with RxJS

Leverage RxJS observables to react to state changes.

- `state$`: Emits `true` (set) or `false` (unset) on any state change.
- `set$`: Emits `void` only when the token becomes set.
- `unset$`: Emits `void` only when the token becomes unset.

```typescript
import { CancellationToken } from '@tstdl/cancellation';

const token = new CancellationToken();

// Subscribe to cancellation events
token.set$.subscribe(() => {
  console.log('Operation has been cancelled!');
});

token.unset$.subscribe(() => {
  console.log('Cancellation has been reset.');
});

token.state$.subscribe((isSet) => {
  console.log(`Token state is now: ${isSet ? 'set' : 'unset'}`);
});

setTimeout(() => token.set(), 500);
setTimeout(() => token.unset(), 1000);
```

### Creating a Child Token

Create a hierarchy of tokens. When a parent token is cancelled, all its children are also cancelled.

```typescript
import { CancellationToken } from '@tstdl/cancellation';

const parentToken = new CancellationToken();
const childToken = parentToken.createChild();

childToken.set$.subscribe(() => {
  console.log('Child token was set.');
});

console.log('Parent isSet:', parentToken.isSet); // false
console.log('Child isSet:', childToken.isSet);   // false

// Cancelling the parent will also cancel the child
parentToken.set();

console.log('Parent isSet:', parentToken.isSet); // true
console.log('Child isSet:', childToken.isSet);   // true
```

### Interoperability with `AbortSignal`

Integrate with standard browser and Node.js APIs like `fetch` by converting a token to an `AbortSignal`.

```typescript
import { CancellationToken } from '@tstdl/cancellation';

const token = new CancellationToken();

// Convert to a standard AbortSignal
const abortSignal = token.asAbortSignal();

abortSignal.addEventListener('abort', () => {
  console.log('AbortSignal was aborted!');
});

// Use it with fetch
fetch('https://api.example.com/data', { signal: abortSignal })
  .catch((error) => {
    if (error.name === 'AbortError') {
      console.log('Fetch request was aborted.');
    }
  });

// Cancel the operation
setTimeout(() => token.set(), 1000);
```

### Creating from other Sources

`CancellationToken.from()` can create a token that is automatically set when another async operation completes or is aborted.

```typescript
import { CancellationToken } from '@tstdl/cancellation';
import { Subject } from 'rxjs';

// From a Promise
const promise = new Promise(resolve => setTimeout(resolve, 1000));
const tokenFromPromise = CancellationToken.from(promise);
tokenFromPromise.set$.subscribe(() => console.log('Token from promise was set.'));

// From an AbortSignal
const abortController = new AbortController();
const tokenFromSignal = CancellationToken.from(abortController.signal);
tokenFromSignal.set$.subscribe(() => console.log('Token from AbortSignal was set.'));
setTimeout(() => abortController.abort(), 2000);

// From an RxJS Observable
const source$ = new Subject<void>();
const tokenFromObservable = CancellationToken.from(source$);
tokenFromObservable.set$.subscribe(() => console.log('Token from Observable was set.'));
setTimeout(() => source$.next(), 3000);
```

### Connecting Tokens

You can manually connect one token to another, causing the target token to mirror the source's state.

```typescript
import { CancellationToken } from '@tstdl/cancellation';

const sourceToken = new CancellationToken();
const targetToken = new CancellationToken();

// Connect source to target. When source is set, target is set.
sourceToken.connect(targetToken);

targetToken.set$.subscribe(() => {
  console.log('Target token was set because source was set.');
});

sourceToken.set();
```

### Error Handling and Completion

A token can be put into an error state or completed, which notifies all subscribers and prevents further state changes.

```typescript
import { CancellationToken } from '@tstdl/cancellation';

const token = new CancellationToken();

token.state$.subscribe({
  next: (isSet) => console.log(`State changed to: ${isSet}`),
  error: (err) => console.error('Token errored:', err.message),
  complete: () => console.log('Token completed and is now inactive.'),
});

// Propagate an error
token.error(new Error('Something went wrong'));

// Any subsequent awaits on the token will now throw
try {
  await token.$set;
}
catch (e: any) {
  console.error('Awaiting the errored token threw:', e.message);
}

// Another token for completion
const completableToken = new CancellationToken();

completableToken.state$.subscribe({
  complete: () => console.log('Completable token is done.'),
});

completableToken.complete();
```

## API Summary

### `CancellationSignal` (Read-only)

| Member | Type | Description |
| :--- | :--- | :--- |
| `state` | `boolean` | The current state (`true` for set, `false` for unset). |
| `isSet` | `boolean` | Whether the token is currently set (cancelled). |
| `isUnset`| `boolean` | Whether the token is currently unset (not cancelled). |
| `state$` | `Observable<boolean>` | Emits the current state and any subsequent changes. |
| `set$` | `Observable<void>` | Emits when the token is set. |
| `unset$` | `Observable<void>` | Emits when the token is unset. |
| `$set` | `Promise<void>` | A promise that resolves when the token is set. |
| `$unset` | `Promise<void>` | A promise that resolves when the token is unset. |
| `$state` | `Promise<boolean>` | A promise that resolves with the next state change. |
| `asAbortSignal()` | `AbortSignal` | Returns a standard `AbortSignal` linked to this token. |
| `createChild(config?)` | `CancellationToken` | Creates a new `CancellationToken` connected to this signal. |
| `connect(target, config?)` | `void` | Propagates state changes from this signal to a target token. |
| `then()` | `Promise<void>` | Allows `await`ing the signal until it is set. |
| `subscribe()` | `Unsubscribable` | Subscribes to the `set$` observable. |

### `CancellationToken` (Writable)

Inherits all members from `CancellationSignal`.

| Member | Arguments | Return Type | Description |
| :--- | :--- | :--- | :--- |
| `constructor(initialState?)` | `initialState?: boolean` | `CancellationToken` | Creates a new token, optionally with an initial state. |
| `signal` | - | `CancellationSignal` | Gets a read-only `CancellationSignal` for this token. |
| `from(source, options?)` | `source: AbortSignal \| Promise \| Observable` | `CancellationToken` | **(static)** Creates a token that is set when the source emits/resolves/aborts. |
| `connect(source$, target, config?)` | `source$: Observable<boolean>`, `target: CancellationToken`, `config?: ConnectConfig` | `void` | **(static)** Connects a source observable to a target token. |
| `inherit(parent, config?)` | `parent: CancellationToken \| CancellationSignal` | `this` | Makes this token a child of a parent, inheriting its state. |
| `set()` | - | `void` | Sets the token to the cancelled state. |
| `unset()` | - | `void` | Resets the token to the non-cancelled state. |
| `setState(state)` | `state: boolean` | `void` | Sets the state explicitly. |
| `error(error)` | `error: Error` | `void` | Puts the token in an error state, notifying subscribers. |
| `complete()` | - | `void` | Completes the token, notifying subscribers and cleaning up. |