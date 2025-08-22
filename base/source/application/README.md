# Application Module

Provides a simple and structured way to bootstrap, run, and gracefully shut down applications and their modules.

## Table of Contents

- [Features](#features)
- [Core Concepts](#core-concepts)
- [Usage](#usage)
  - [Basic Application Setup](#basic-application-setup)
  - [Creating a Custom Module](#creating-a-custom-module)
  - [Using Bootstrap Functions](#using-bootstrap-functions)
  - [Graceful Shutdown](#graceful-shutdown)
- [API Summary](#api-summary)

## Features

- **Modular Architecture**: Structure your application into independent, reusable modules.
- **Lifecycle Management**: Handles starting and stopping modules in a controlled manner.
- **Graceful Shutdown**: Responds to process signals (like `SIGINT`) to ensure clean application termination.
- **Dependency Injection**: Seamlessly integrated with the `@tstdl/base/injector` for resolving modules and their dependencies.
- **Bootstrap Support**: Run setup logic (e.g., database migrations, configuration) before any modules are started.
- **Asynchronous Operations**: Fully supports async/await for modern asynchronous workflows.

## Core Concepts

### The Application Class

The `Application` class is a singleton that orchestrates the entire lifecycle of your application. You interact with it through its static methods, primarily `Application.run()`, to start the application and its modules. It manages a dedicated dependency injection container, ensuring modules and services are instantiated correctly.

### Modules

A module is a self-contained unit of functionality, typically defined by a class that extends `ModuleBase` from `@tstdl/base/module`. Each module implements a `_run` method, which contains its main logic.

The `Application` class ensures that the `run()` method of each registered module is executed. When a shutdown is initiated, it calls the `stop()` method on each module, allowing for cleanup operations like closing database connections or finishing pending tasks.

### Bootstrap Functions

Bootstrap functions are asynchronous functions that run before any modules are started. They are ideal for one-time setup tasks such as:
- Configuring services.
- Running database migrations.
- Seeding initial data.
- Validating environment variables.

These functions are executed within the application's dependency injection context, so they can resolve and use any registered services.

### Graceful Shutdown

The application automatically listens for process shutdown signals (e.g., `SIGINT` from Ctrl+C). When a signal is received, it initiates a graceful shutdown sequence:
1. A `CancellationSignal` is triggered, which is passed to all running modules. Modules should use this signal to break out of long-running loops.
2. The `stop()` method of each running module is called, allowing them to perform cleanup tasks.
3. The application waits for all modules to stop before exiting the process.

A shutdown can also be initiated programmatically by calling `Application.requestShutdown()` or `Application.shutdown()`.

## Usage

### Basic Application Setup

Create an entry file (e.g., `main.ts`) and use `Application.run()` to start your modules.

```typescript
// main.ts
import { Application } from '@tstdl/base/application';
import { WebServerModule } from '@tstdl/base/module'; // Example module

// Run the WebServerModule
Application.run(WebServerModule);
```

### Creating a Custom Module

Modules are classes that extend `ModuleBase` and implement the `_run` method. The `cancellationSignal` is provided to allow the module to stop its work gracefully.

```typescript
// services/background-worker.module.ts
import { CancellationSignal } from '@tstdl/base/cancellation';
import { inject, Singleton } from '@tstdl/base/injector';
import { Logger } from '@tstdl/base/logger';
import { ModuleBase } from '@tstdl/base/module';
import { cancelableTimeout } from '@tstdl/base/utils';

@Singleton()
export class BackgroundWorkerModule extends ModuleBase {
  readonly #logger = inject(Logger, BackgroundWorkerModule.name);

  constructor() {
    super('BackgroundWorker');
  }

  protected override async _run(cancellationSignal: CancellationSignal): Promise<void> {
    this.#logger.info('Background worker started.');

    while (cancellationSignal.isUnset) {
      this.#logger.info('Processing task...');
      // Do some work...

      const result = await cancelableTimeout(5000, cancellationSignal);

      if (result == 'canceled') {
        break;
      }
    }

    this.#logger.info('Background worker shutting down.');
  }
}

// main.ts
import { Application } from '@tstdl/base/application';
import { WebServerModule } from '@tstdl/base/module';
import { BackgroundWorkerModule } from './services/background-worker.module.js';

Application.run(WebServerModule, BackgroundWorkerModule);
```

### Using Bootstrap Functions

Pass a configuration object with a `bootstrap` function to `Application.run()`. This function can be `async` and will execute before any modules start.

```typescript
// main.ts
import { Application } from '@tstdl/base/application';
import { inject } from '@tstdl/base/injector';
import { Database, migrate } from '@tstdl/base/orm/server';
import { WebServerModule } from '@tstdl/base/module';

async function bootstrap(): Promise<void> {
  // Bootstrap functions can use dependency injection
  const database = inject(Database);
  console.log('Running database migrations...');
  await migrate(database, { migrationsFolder: './migrations' });
  console.log('Migrations complete.');
}

Application.run({ bootstrap }, WebServerModule);
```

### Graceful Shutdown

You can programmatically trigger a shutdown.

#### Request Shutdown (Non-blocking)

`requestShutdown` signals all modules to stop but does not wait for them to finish. The application will continue running until all modules have stopped.

```typescript
import { Application } from '@tstdl/base/application';

// ... somewhere in your code
Application.requestShutdown();
```

#### Shutdown and Wait (Blocking)

`shutdown` requests a shutdown and returns a `Promise` that resolves when the application has completely stopped.

```typescript
import { Application } from '@tstdl/base/application';

async function performShutdown() {
  console.log('Shutting down application...');
  await Application.shutdown();
  console.log('Application has been shut down.');
}

// ...
performShutdown();
```

## API Summary

| Method/Property         | Parameters                                                                              | Returns         | Description                                                                                             |
| ----------------------- | --------------------------------------------------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------- |
| `run()`                 | `...modules: (Type<Module> \| FunctionModuleFunction \| RunOptions)[]`                    | `void`          | Starts the application, runs bootstrap functions, and starts all registered modules.                    |
| `registerModule()`      | `moduleType: Type<Module>`                                                              | `void`          | Registers a module type to be run when the application starts.                                          |
| `registerModuleFunction()`| `fn: FunctionModuleFunction`                                                            | `void`          | Registers a simple function as a module.                                                                |
| `shutdown()`            | -                                                                                       | `Promise<void>` | Requests a shutdown and returns a promise that resolves when the application has fully stopped.       |
| `requestShutdown()`     | -                                                                                       | `void`          | Signals the application to start a graceful shutdown without waiting for it to complete.              |
| `waitForShutdown()`     | -                                                                                       | `Promise<void>` | Returns a promise that resolves when the application has fully shut down.                               |
| `shutdownSignal`        | -                                                                                       | `CancellationSignal` | A signal that is set when a shutdown is initiated. Modules should listen to this to stop gracefully. |