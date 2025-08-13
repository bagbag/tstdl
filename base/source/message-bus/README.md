# Message Bus

A flexible, RxJS-based message bus module for in-process and cross-context communication, designed for dependency injection.

## Table of Contents

- [Features](#features)
- [Core Concepts](#core-concepts)
  - [MessageBus](#messagebus)
  - [Channels](#channels)
  - [Providers and Implementations](#providers-and-implementations)
  - [Message Observables](#message-observables)
- [Usage](#usage)
  - [1. Configuration](#1-configuration)
  - [2. Injecting a Message Bus](#2-injecting-a-message-bus)
  - [3. Publishing Messages](#3-publishing-messages)
  - [4. Subscribing to Messages](#4-subscribing-to-messages)
  - [5. Cleanup](#5-cleanup)
- [API Summary](#api-summary)

## Features

- **Decoupled Communication**: Enables different parts of an application to communicate without direct dependencies.
- **Two Implementations**:
  - **`LocalMessageBus`**: For efficient in-process communication (e.g., within a single browser tab or Node.js process).
  - **`BroadcastChannelMessageBus`**: For cross-context communication between browser tabs, windows, or iframes of the same origin.
- **Provider-Based**: Integrates seamlessly with dependency injection containers.
- **Channel-Scoped**: Isolates messages into named channels to prevent crosstalk.
- **RxJS Integration**: Leverages RxJS observables for powerful, reactive message handling.
- **Clear Message Scopes**: Differentiates between messages from other instances (`messages$`) and all messages, including self-published ones (`allMessages$`).
- **Graceful Shutdown**: Implements `AsyncDisposable` for proper resource management and cleanup.

## Core Concepts

### MessageBus

The `MessageBus<T>` is the core abstract class. It represents a communication channel for messages of type `T`. It provides methods to publish messages and observables to subscribe to them. Each `MessageBus` instance is tied to a specific named channel.

### Channels

Channels are simple strings that act as identifiers for a message stream. Messages published to a channel are only received by subscribers to that same channel. This allows multiple, independent communication streams to coexist within the same application.

### Providers and Implementations

The module provides two concrete implementations of `MessageBus`, each with a corresponding provider for dependency injection.

- **`LocalMessageBusProvider` & `LocalMessageBus`**
  - **Use Case**: Communication within a single JavaScript execution context (e.g., a single browser tab or Node.js application).
  - **Mechanism**: Uses a shared in-memory RxJS `Subject` for each channel. This is highly efficient for in-process messaging.

- **`BroadcastChannelMessageBusProvider` & `BroadcastChannelMessageBus`**
  - **Use Case**: Communication between different browsing contexts of the same origin (e.g., synchronizing state across multiple open tabs).
  - **Mechanism**: Wraps the standard web `BroadcastChannel` API.

The `MessageBusProvider` is a factory responsible for creating and managing bus instances for each channel, ensuring that all requests for the same channel share the appropriate underlying resource.

### Message Observables

Each `MessageBus` instance exposes two distinct RxJS observables:

- `messages$: Observable<T>`: Emits messages published by **other** instances on the same channel. This is useful for reacting to external events, for example, a state change triggered in another browser tab.
- `allMessages$: Observable<T>`: Emits **all** messages on the channel, including those published by the current instance itself. This is useful when you want to react to a message regardless of its origin, such as for logging or state updates.

## Usage

### 1. Configuration

Before injecting a `MessageBus`, register its provider in your application's DI container. Choose the provider that fits your application's needs.

**For in-process communication (most common for backend or single-page apps):**

```typescript
import { configureLocalMessageBus } from '@tstdl/base/message-bus';

// At application startup
configureLocalMessageBus();
```

**For cross-tab/window communication in browsers:**

```typescript
import { configureBroadcastChannelMessageBus } from '@tstdl/base/message-bus';

// At application startup
configureBroadcastChannelMessageBus();
```

### 2. Injecting a Message Bus

Use your DI framework's injection mechanism to get a `MessageBus` instance for a specific channel. The channel name is passed as the resolution argument.

```typescript
import { inject } from '@tstdl/base/injector';
import { MessageBus } from '@tstdl/base/message-bus';

// Define the type of messages for your channel
type UserEvent = { type: 'login'; userId: string } | { type: 'logout' };

class UserSession {
  private readonly userEventBus = inject(MessageBus<UserEvent>, 'user-events');

  // ...
}
```

### 3. Publishing Messages

Use the `publish()` or `publishAndForget()` methods to send messages to the channel.

```typescript
// Publish a message and wait for the operation to complete
await userEventBus.publish({ type: 'login', userId: 'usr-123' });

// Publish a message without waiting (fire and forget)
userEventBus.publishAndForget({ type: 'logout' });
```

### 4. Subscribing to Messages

Subscribe to the `messages$` or `allMessages$` observables to receive and react to messages. Always remember to unsubscribe to prevent memory leaks.

```typescript
import { Subscription } from 'rxjs';

const subscriptions = new Subscription();

// Listen to login/logout events from *other* browser tabs or contexts
const externalSub = userEventBus.messages$.subscribe((event) => {
  if (event.type === 'login') {
    console.log(`User ${event.userId} logged in from another tab.`);
    // e.g., refresh shared session state
  }
});

// Listen to *all* events, including those published by this instance
const allSub = userEventBus.allMessages$.subscribe((event) => {
  console.log('A user event occurred:', event);
  // e.g., update local UI state
});

subscriptions.add(externalSub);
subscriptions.add(allSub);

// To clean up later:
// subscriptions.unsubscribe();
```

### 5. Cleanup

`MessageBus` instances are `AsyncDisposable`. If you manage their lifecycle manually, clean them up to release underlying resources (like closing the BroadcastChannel).

```typescript
import { disposeAsync } from '@tstdl/base/disposable';

// Assuming userEventBus is no longer needed
await disposeAsync(userEventBus);
```

If the bus is managed by a DI container, this cleanup is often handled automatically based on the component's lifecycle.

## API Summary

### `MessageBus<T>`

| Member               | Signature / Type                | Description                                                                        |
| :------------------- | :------------------------------ | :--------------------------------------------------------------------------------- |
| `messages$`          | `Observable<T>`                 | An observable for messages received from other instances.                          |
| `allMessages$`       | `Observable<T>`                 | An observable for all messages, including those published by the current instance. |
| `publish()`          | `(message: T) => Promise<void>` | Asynchronously publishes a message to the channel.                                 |
| `publishAndForget()` | `(message: T) => void`          | Publishes a message without awaiting completion (fire and forget).                 |
| `[disposeAsync]()`   | `() => Promise<void>`           | Disposes the message bus and releases its resources.                               |

### Providers

- **`LocalMessageBusProvider`**: Provides `LocalMessageBus` instances for same-context communication.
- **`BroadcastChannelMessageBusProvider`**: Provides `BroadcastChannelMessageBus` instances for cross-context communication.

### Configuration Functions

- **`configureLocalMessageBus(): void`**: Registers `LocalMessageBusProvider` as the default provider for `MessageBus`.
- **`configureBroadcastChannelMessageBus(): void`**: Registers `BroadcastChannelMessageBusProvider` as the default provider for `MessageBus`.
