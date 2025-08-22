# RPC Module

Provides a powerful and type-safe mechanism for Remote Procedure Calls (RPC) between different JavaScript environments, such as the main thread, web workers, or different browser windows.

## Table of Contents
- [Features](#features)
- [Core Concepts](#core-concepts)
- [Usage](#usage)
  - [Basic Worker Communication](#basic-worker-communication)
  - [Streaming Data with ReadableStream](#streaming-data-with-readablestream)
  - [Transferring Data Efficiently](#transferring-data-efficiently)
- [API Summary](#api-summary)

## Features

*   **Type-Safe Proxies:** Interact with remote objects and functions as if they were local, with full TypeScript support.
*   **Multiple Transports:** Works seamlessly with `Worker`, `SharedWorker`, `MessagePort`, and `Window` objects via `MessagePortRpcEndpoint`.
*   **Extensible Adapters:** Supports complex, non-serializable types like `ReadableStream` through custom adapters.
*   **Transferable Objects:** Optimizes performance by transferring objects like `ArrayBuffer` instead of cloning them.
*   **Advanced Serialization:** Fine-grained control over how objects are transmitted—either by proxy, by value (serialization), or using a custom adapter.

## Core Concepts

This module simplifies communication between different JavaScript contexts by abstracting away the complexities of `postMessage`.

-   **Endpoint (`MessagePortRpcEndpoint`):** An endpoint is the communication hub for one side of an RPC connection. It's created from a transport like a `Worker` or `MessagePort`. It manages the creation and lifecycle of communication channels.

-   **Channel (`RpcChannel`):** A channel is a dedicated, isolated communication link between two endpoints. When you establish a connection, a main control channel is used to negotiate and open new channels for specific proxies or adapted objects, ensuring messages don't get mixed up.

-   **Exposing & Connecting:** The core pattern involves making an object or function available on one side using `Rpc.expose()` and connecting to it from the other side using `Rpc.connect()`.

-   **Proxies:** When you `connect` to a remote object, you receive a local *proxy*. Any interaction with this proxy (calling methods, getting/setting properties) is automatically translated into an RPC message, sent to the remote environment, executed on the original object, and the result is sent back. This creates the illusion that the remote object is available locally.

-   **Adapters:** Some objects, like `ReadableStream`, cannot be serialized or proxied directly. Adapters solve this by defining a custom communication protocol over an RPC channel. For instance, the `ReadableStreamRpcAdapter` creates a proxy stream that pulls data from the original stream on demand. You can create custom adapters for any object type by implementing the `RpcAdapter` interface.

-   **Value Transmission Control:** By default, primitives are sent by copy and objects are sent by creating a remote proxy. You can alter this behavior:
    -   `Rpc.serialize(obj)`: Forces the object to be serialized and sent by value.
    -   `Rpc.proxy(obj)`: Explicitly marks an object to be sent as a proxy.
    -   `Rpc.adapt(obj, adapter)`: Uses a specific adapter to handle the object's transmission.
    -   `Rpc.transfer(obj, transferables)`: Marks associated data (like `ArrayBuffer`s) to be transferred efficiently instead of copied.

## Usage

### Basic Worker Communication

This example demonstrates how to expose a service class in a web worker and consume it from the main thread.

**`pet.service.ts` (shared code)**
```typescript
export type Pet = {
  name: string;
  species: 'dog' | 'cat';
};

export class PetService {
  private pets: Pet[] = [{ name: 'Fido', species: 'dog' }];

  async getPets(): Promise<Pet[]> {
    return this.pets;
  }

  async addPet(pet: Pet): Promise<void> {
    this.pets.push(pet);
  }
}
```

**`worker.ts` (Web Worker)**
```typescript
import { Rpc } from '@tstdl/rpc';
import { MessagePortRpcEndpoint } from '@tstdl/rpc/endpoints';
import { PetService } from './pet.service.js';

const endpoint = new MessagePortRpcEndpoint(self as any);
Rpc.listen(endpoint);

const petService = new PetService();
Rpc.expose(petService, 'pet-service');
```

**`main.ts` (Main Thread)**
```typescript
import { Rpc } from '@tstdl/rpc';
import { MessagePortRpcEndpoint } from '@tstdl/rpc/endpoints';
import type { PetService } from './pet.service.js';

async function main() {
  const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
  const endpoint = new MessagePortRpcEndpoint(worker);

  const remotePetService = await Rpc.connect<PetService>(endpoint, 'pet-service');

  const allPets = await remotePetService.getPets();
  console.log('Initial pets:', allPets); // -> [{ name: 'Fido', species: 'dog' }]

  await remotePetService.addPet({ name: 'Whiskers', species: 'cat' });

  const updatedPets = await remotePetService.getPets();
  console.log('Updated pets:', updatedPets); // -> [{ name: 'Fido', species: 'dog' }, { name: 'Whiskers', species: 'cat' }]
}

main();
```

### Streaming Data with `ReadableStream`

The `ReadableStreamRpcAdapter` allows you to transparently send and receive readable streams.

**`stream.worker.ts` (Web Worker)**
```typescript
import { Rpc } from '@tstdl/rpc';
import { ReadableStreamRpcAdapter } from '@tstdl/rpc/adapters';
import { MessagePortRpcEndpoint } from '@tstdl/rpc/endpoints';
import { timeout } from '@tstdl/base/utils';

// Register the adapter on both ends
Rpc.registerAdapter(new ReadableStreamRpcAdapter());

const endpoint = new MessagePortRpcEndpoint(self as any);
Rpc.listen(endpoint);

function getLogStream(): ReadableStream<string> {
  let count = 0;
  return new ReadableStream({
    async pull(controller) {
      if (count++ >= 5) {
        controller.close();
        return;
      }
      await timeout(500);
      controller.enqueue(`Log entry #${count}`);
    },
  });
}

// Expose a function that returns an adapted stream
const getAdaptedLogStream = () => Rpc.adapt(getLogStream(), new ReadableStreamRpcAdapter());

Rpc.expose(getAdaptedLogStream, 'log-service');
```

**`main.ts` (Main Thread)**
```typescript
import { Rpc } from '@tstdl/rpc';
import { ReadableStreamRpcAdapter } from '@tstdl/rpc/adapters';
import { MessagePortRpcEndpoint } from '@tstdl/rpc/endpoints';

async function main() {
  // Register the adapter on both ends
  Rpc.registerAdapter(new ReadableStreamRpcAdapter());

  const worker = new Worker(new URL('./stream.worker.ts', import.meta.url), { type: 'module' });
  const endpoint = new MessagePortRpcEndpoint(worker);

  const getRemoteLogStream = await Rpc.connect<() => ReadableStream<string>>(endpoint, 'log-service');

  const stream = await getRemoteLogStream();
  const reader = stream.getReader();

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      console.log('Stream finished.');
      break;
    }
    console.log('Received:', value);
  }
}

main();
```

### Transferring Data Efficiently

Use `Rpc.transfer` to move large data like an `ArrayBuffer` without the performance overhead of copying.

**`upload.worker.ts` (Web Worker)**
```typescript
import { Rpc } from '@tstdl/rpc';
import { MessagePortRpcEndpoint } from '@tstdl/rpc/endpoints';

const endpoint = new MessagePortRpcEndpoint(self as any);
Rpc.listen(endpoint);

async function uploadFile(buffer: ArrayBuffer): Promise<number> {
  console.log(`Worker received a buffer of size: ${buffer.byteLength}`);
  return buffer.byteLength;
}

Rpc.expose(uploadFile, 'upload-service');
```

**`main.ts` (Main Thread)**
```typescript
import { Rpc } from '@tstdl/rpc';
import { MessagePortRpcEndpoint } from '@tstdl/rpc/endpoints';

async function main() {
  const worker = new Worker(new URL('./upload.worker.ts', import.meta.url), { type: 'module' });
  const endpoint = new MessagePortRpcEndpoint(worker);

  const remoteUploadFile = await Rpc.connect<(buffer: ArrayBuffer) => Promise<number>>(endpoint, 'upload-service');

  // Create some data
  const buffer = new Uint8Array(1024 * 1024 * 4).buffer; // 4MB
  console.log(`Main thread sending buffer of size: ${buffer.byteLength}`);

  // Call the remote function, marking the buffer for transfer
  const receivedSize = await remoteUploadFile(Rpc.transfer(buffer, [buffer]));

  console.log(`Worker confirmed receiving ${receivedSize} bytes.`);
  console.log(`Buffer size in main thread after transfer: ${buffer.byteLength}`); // -> 0
}

main();
```

## API Summary

| Function/Class | Arguments | Returns | Description |
| :--- | :--- | :--- | :--- |
| **Rpc** |
| `listen` | `endpoint: RpcEndpoint` | `void` | Starts listening for incoming connections on an endpoint. |
| `connect` | `endpoint: RpcEndpoint`, `name?: string` | `Promise<RpcRemote<T>>` | Connects to a remote object exposed with the given name. |
| `expose` | `object: RpcRemoteInput`, `name?: string` | `void` | Makes an object or function available for remote connections. |
| `registerAdapter` | `adapter: RpcAdapter` | `void` | Registers a custom adapter for handling non-serializable types. |
| `proxy` | `object: T` | `T` | Explicitly marks an object to be transmitted as a remote proxy. |
| `transfer` | `object: T`, `transfer: any[]` | `T` | Marks an object and its associated transferable data for efficient transfer. |
| `serialize` | `object: T`, `options?: SerializationOptions` | `T` | Forces an object to be transmitted by value (serialized) instead of by proxy. |
| `adapt` | `object: T`, `adapter: RpcAdapter` | `T` | Marks an object to be handled by a specific adapter. |
| **MessagePortRpcEndpoint** |
| `from` | `transport: MessagePortRpcTransport` | `MessagePortRpcEndpoint` | Creates a new RPC endpoint from a transport (Worker, MessagePort, etc.). |
| **ReadableStreamRpcAdapter** |
| `constructor` | `maxChunkSize?: number` | `ReadableStreamRpcAdapter` | Creates an adapter for `ReadableStream`. |