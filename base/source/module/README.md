# Application Modules (`@tstdl/base/module`)

This module provides a framework for building modular, service-based applications. It establishes a clear contract for components (`Module`) with managed lifecycles, state tracking, and integrated metric reporting.

## Table of Contents

- [Features](#features)
- [Core Concepts](#core-concepts)
  - [The Module Interface](#the-module-interface)
  - [ModuleBase Class](#modulebase-class)
  - [Lifecycle and State](#lifecycle-and-state)
  - [Metrics and Reporting](#metrics-and-reporting)
- [Usage](#usage)
  - [Creating a Custom Module](#creating-a-custom-module)
  - [Using Pre-built Modules](#using-pre-built-modules)
    - [FunctionModule](#functionmodule)
    - [WebServerModule](#webservermodule)
  - [Running and Stopping Modules](#running-and-stopping-modules)
  - [Reporting Metrics](#reporting-metrics)
- [API Summary](#api-summary)

## Features

- **Modular Architecture**: Decompose your application into independent, reusable modules.
- **Managed Lifecycle**: Each module has a defined `run()` and `stop()` lifecycle, managed by the framework.
- **State Tracking**: Modules have an explicit state (`Running`, `Stopped`, `Erroneous`).
- **Graceful Shutdown**: Built-in support for graceful shutdown via `CancellationSignal`.

## Core Concepts

### The Module Interface

The core of this package is the `Module` interface. Any class implementing this interface can be managed by the application's lifecycle helpers.

A `Module` has:

- `name`: A string identifier.
- `state`: The current `ModuleState` (`Running`, `Stopped`, etc.).
- `metrics`: An object map of metrics the module exposes.
- `run()`: An async method to start the module's operation.
- `stop()`: An async method to gracefully stop the module.

### ModuleBase Class

While you can implement the `Module` interface directly, the `ModuleBase` abstract class is the recommended starting point. It provides boilerplate implementation for state management and cancellation handling. You only need to implement the `_run()` method, which receives a `CancellationSignal`. The base class handles starting, stopping, and state transitions automatically.

### Lifecycle and State

- **`run()`**: Starts the module. The `ModuleBase` sets the state to `Running` and calls the `_run()` method. The `run()` promise resolves when the module's operation is complete or when it's stopped.
- **`stop()`**: Initiates a graceful shutdown. The `ModuleBase` triggers the `CancellationToken` passed to `_run()`, allowing long-running tasks to clean up and exit. It waits for the `run()` promise to settle before completing.
- **`ModuleState`**: An enum (`Running`, `Stopping`, `Stopped`, `Erroneous`) that reflects the current lifecycle status of the module.

### Metrics and Reporting

Modules can expose operational metrics (e.g., active connections, processed items) through their `metrics` property. The `ModuleMetricReporter` class can then be used to periodically sample these metrics, calculate aggregations (like averages, min, max), and report them to the console, providing a simple way to monitor the application's health.

## Usage

### Creating a Custom Module

Extend `ModuleBase` and implement the `_run` method. This method contains the module's main logic and will be executed until the provided `cancellationSignal` is triggered.

```typescript
import { CancellationSignal } from '@tstdl/base/cancellation';
import { ModuleBase, ModuleMetricType } from '@tstdl/base/module';
import { cancelableTimeout } from '@tstdl/base/utils';

class MyWorkerModule extends ModuleBase {
  private processedItems = 0;

  readonly metrics = {
    processed: {
      type: ModuleMetricType.Counter,
      getValue: () => this.processedItems,
    },
  };

  constructor() {
    super('MyWorker');
  }

  protected async _run(cancellationSignal: CancellationSignal): Promise<void> {
    while (cancellationSignal.isUnset) {
      console.log('Doing work...');
      this.processedItems++;
      await cancelableTimeout(1000, cancellationSignal);
    }

    console.log('Worker stopping gracefully.');
  }
}
```

### Using Pre-built Modules

#### FunctionModule

For simple, one-off tasks, `FunctionModule` wraps an async function into a `Module`.

```typescript
import { FunctionModule } from '@tstdl/base/module';
import { CancellationSignal } from '@tstdl/base/cancellation';
import { cancelableTimeout } from '@tstdl/base/utils';

const simpleTask = new FunctionModule(async (cancellationSignal: CancellationSignal) => {
  console.log('Function module started.');
  await cancelableTimeout(5000, cancellationSignal);
  console.log('Function module finished.');
}, 'SimpleTask');
```

#### WebServerModule

The `WebServerModule` starts a fully-featured HTTP server with API routing. It is typically resolved from the dependency injector.

```typescript
import { WebServerModule, configureWebServerModule } from '@tstdl/base/module';
import { Injector } from '@tstdl/base/injector';

// Configure the module (optional)
configureWebServerModule({ port: 3000 });

// Resolve from injector
const injector = new Injector();
const webServerModule = injector.resolve(WebServerModule);

// webServerModule can now be run like any other module.
```

### Running and Stopping Modules

The `runModules` and `stopModules` utilities manage the lifecycle of an array of modules, making it easy to compose an application's entry point.

```typescript
import { WebServerModule } from '@tstdl/base/module';
import { runModules, stopModules } from '@tstdl/base/module';
import { getShutdownSignal } from '@tstdl/base/process-shutdown';
import { Logger } from '@tstdl/base/logger';
import { Injector } from '@tstdl/base/injector';

async function main(): Promise<void> {
  const injector = new Injector();
  const logger = injector.resolve(Logger);
  const webServerModule = injector.resolve(WebServerModule, { port: 8080 });
  const myWorkerModule = new MyWorkerModule();

  const modules = [webServerModule, myWorkerModule];

  // Run all modules concurrently
  const runPromise = runModules(modules, logger);

  // Wait for a shutdown signal (e.g., CTRL+C)
  await getShutdownSignal();

  // Stop all modules gracefully
  await stopModules(modules, logger);

  // Wait for the run process to finish
  await runPromise;
}

main().catch(console.error);
```

### Reporting Metrics

Set up `ModuleMetricReporter` to monitor your modules.

```typescript
import { WebServerModule, ModuleMetricReporter } from '@tstdl/base/module';
import { getShutdownSignal } from '@tstdl/base/process-shutdown';
import { Injector } from '@tstdl/base/injector';

const injector = new Injector();
const webServerModule = injector.resolve(WebServerModule, { port: 8080 });

// Sample every 1s, keep 60s of data, report every 5s.
const reporter = new ModuleMetricReporter(1000, 60, 5);

reporter.register('WebServer', {
  metric: webServerModule.metrics.connectedSockets,
  reports: [
    { displayName: 'Sockets (Current)', aggregation: 'last' },
    { displayName: 'Sockets (Avg 1m)', aggregation: 'avg' },
    { displayName: 'Sockets (Max 1m)', aggregation: 'max' },
  ],
});

// Run the reporter in the background
reporter.run(getShutdownSignal());

// ... run your modules
```

## API Summary

| Name                                | Type           | Description                                                                                          |
| :---------------------------------- | :------------- | :--------------------------------------------------------------------------------------------------- |
| `Module`                            | interface      | Defines the contract for an application module with a managed lifecycle.                             |
| `ModuleBase`                        | abstract class | Base class for creating modules, handling state and cancellation automatically.                      |
| `FunctionModule`                    | class          | A simple module implementation that wraps a single asynchronous function.                            |
| `WebServerModule`                   | class          | A module that starts an HTTP server and API gateway, configured via dependency injection.            |
| `ModuleMetricReporter`              | class          | Samples and reports metrics from registered modules to the console for monitoring.                   |
| `runModules(modules, logger?)`      | function       | Starts multiple modules concurrently. Returns a promise that resolves when all modules have stopped. |
| `stopModules(modules, logger?)`     | function       | Stops multiple modules gracefully. Returns a promise that resolves when all modules are stopped.     |
| `configureWebServerModule(config?)` | function       | Configures the default settings for the `WebServerModule`.                                           |
