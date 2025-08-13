# @tstdl/base/message-bus

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
  - [2. Injecting and Using a Message Bus](#2-injecting-and-using-a-message-bus)
  - [3. Publishing Messages](#3-publishing-messages)
  - [4. Subscribing to Messages](#4-subscribing-to-messages)
  - [5. Cleanup](#5-cleanup)
- [API Summary](#api-summary)

## Features

- **Two Implementations**:
  - **`LocalMessageBus`**: For efficient, in-process communication (e.g., within a single browser tab or Node.js process).
  - **`BroadcastChannelMessageBus`**: For cross-context communication (e.g., between different browser tabs, windows, or iframes of the same origin) using the standard `BroadcastChannel` API.
- **Provider-Based**: Easily integrates with dependency injection (DI) containers. Get a message bus for a specific channel without manual instantiation.
- **Channel-Scoped**: Isolate messages into named channels to prevent crosstalk.
- **RxJS Integration**: Leverages the power of RxJS observables for reactive message handling.
- **Clear Message Scopes**: Differentiates between messages from other instances (`messages$`) and all messages including self-published ones (`allMessages$`).
- **Asynchronous Cleanup**: Implements the `AsyncDisposable` interface for proper resource management.

## Core Concepts

### MessageBus

The `MessageBus<T>` is the core abstract class. It represents a communication channel for messages of type `T`. It provides methods to publish messages and observables to subscribe to them. Each `MessageBus` instance is tied to a specific named channel.

### Channels

Channels are simple strings that act as identifiers for a message stream. Messages published to a channel are only received by subscribers to that same channel. This allows multiple, independent communication streams to coexist within the same application.

### Providers and Implementations

The module provides two concrete implementations of the `MessageBus`, each with a corresponding provider for DI.

- **`LocalMessageBusProvider` & `LocalMessageBus`**
  - **Use Case**: Communication within a single JavaScript execution context (e.g., within one browser tab).
  - **Mechanism**: Uses a shared in-memory RxJS `Subject` for each channel. This is highly efficient for in-process messaging.

- **`BroadcastChannelMessageBusProvider` & `BroadcastChannelMessageBus`**
  - **Use Case**: Communication between different browsing contexts of the same origin (e.g., synchronizing state across multiple open tabs).
  - **Mechanism**: Wraps the standard Web `BroadcastChannel` API.

The `MessageBusProvider` is a factory responsible for creating and managing bus instances for each channel, ensuring that all requests for the same channel share the appropriate underlying resource (like a `Subject` or a `BroadcastChannel` instance).

### Message Observables

Each `MessageBus` instance exposes two distinct RxJS observables:

- `messages$: Observable<T>`: Emits messages published by **other** instances on the same channel. This is useful for reacting to external events, for example, a message from another browser tab.
- `allMessages$: Observable<T>`: Emits **all** messages on the channel, including those published by the current instance itself. This is useful when you want to react to a message regardless of its origin.

## Usage

### 1. Configuration

Before injecting a `MessageBus`, you need to register its provider in your application's DI container. Choose the provider that fits your needs.

**For in-process communication:**

```typescript
import { configureLocalMessageBus } from '@tstdl/base/message-bus';

// At application startup
configureLocalMessageBus();
```

**For cross-tab/window communication:**

```typescript
import { configureBroadcastChannelMessageBus } from '@tstdl/base/message-bus';

// At application startup
configureBroadcastChannelMessageBus();
```

### 2. Injecting and Using a Message Bus

Use your DI framework's injection mechanism to get a `MessageBus` instance for a specific channel.

```typescript
import { inject } from '#/injector/index.js'; // your dependency injector
import { MessageBus } from '@tstdl/base/message-bus';

// Define the type of messages for your channel
type UserEvent = { type: 'login', userId: string } | { type: 'logout' };

// Get a message bus for the 'user-events' channel
const userEventBus = inject(MessageBus<UserEvent>, 'user-events');
```

### 3. Publishing Messages

Use the `publish()` or `publishAndForget()` methods to send messages.

```typescript
// Publish a message and wait for it to be sent
await userEventBus.publish({ type: 'login', userId: 'usr-123' });

// Publish a message without waiting (fire and forget)
userEventBus.publishAndForget({ type: 'logout' });
```

### 4. Subscribing to Messages

Subscribe to the `messages$` or `allMessages$` observables to receive messages.

```typescript
import { Subscription } from 'rxjs';

const subscriptions = new Subscription();

// Listen to login/logout events from other browser tabs
const externalSub = userEventBus.messages$.subscribe(event => {
  if (event.type == 'login') {
    console.log(`User ${event.userId} logged in from another tab.`);
  }
});

// Listen to all events, including those published by this instance
const allSub = userEventBus.allMessages$.subscribe(event => {
  console.log('User event occurred:', event);
});

subscriptions.add(externalSub);
subscriptions.add(allSub);

// Later, to clean up:
// subscriptions.unsubscribe();
```

### 5. Cleanup

`MessageBus` instances are `AsyncDisposable`. Clean them up to release resources and prevent memory leaks, especially for `BroadcastChannelMessageBus`.

```typescript
import { disposeAsync } from '#/disposable/disposable.js';

await disposeAsync(userEventBus);
```
If the bus is managed by a DI container, cleanup is often handled automatically based on the component's lifecycle.

## API Summary

### Classes

- **`MessageBus<T>`** (abstract)
  - `messages$: Observable<T>`: An observable for messages from other instances.
  - `allMessages$: Observable<T>`: An observable for all messages, including self-published.
  - `publish(message: T): Promise<void>`: Asynchronously publishes a message.
  - `publishAndForget(message: T): void`: Publishes a message without awaiting completion.
  - `[disposeAsync](): Promise<void>`: Disposes the message bus.

- **`MessageBusProvider`** (abstract)
  - `get<T>(channel: string): MessageBus<T>`: Gets or creates a `MessageBus` instance for the specified channel.

- **`LocalMessageBusProvider`**
  - An implementation of `MessageBusProvider` that provides `LocalMessageBus` instances.

- **`BroadcastChannelMessageBusProvider`**
  - An implementation of `MessageBusProvider` that provides `BroadcastChannelMessageBus` instances.

### Functions

- **`configureLocalMessageBus(): void`**: Registers `LocalMessageBusProvider` as the default provider for `MessageBus`.
- **`configureBroadcastChannelMessageBus(): void`**: Registers `BroadcastChannelMessageBusProvider` as the default provider for `MessageBus`.