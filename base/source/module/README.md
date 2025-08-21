# Application Modules (@tstdl/base/module)

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
  - [Running and Stopping a Module](#running-and-stopping-a-module)
  - [Reporting Metrics](#reporting-metrics)
- [API Summary](#api-summary)

## Features

- **Modular Architecture**: Decompose your application into independent, reusable modules.
- **Managed Lifecycle**: Each module has a defined `run()` and `stop()` lifecycle.
- **State Tracking**: Modules have an explicit state (`Running`, `Stopped`, `Erroneous`).
- **Graceful Shutdown**: Built-in support for graceful shutdown via `CancellationSignal`.
- **Integrated Metrics**: A standardized way for modules to expose metrics.
- **Pre-built Modules**: Includes ready-to-use modules for common tasks like running a web server.

## Core Concepts

### The Module Interface

The core of this package is the `Module` interface. Any class implementing this interface can be managed by the application's lifecycle.

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

class ProductProcessorModule extends ModuleBase {
  private processedProducts = 0;

  readonly metrics = {
    processed: {
      type: ModuleMetricType.Counter,
      getValue: () => this.processedProducts,
    },
  };

  constructor() {
    super('ProductProcessor');
  }

  protected async _run(cancellationSignal: CancellationSignal): Promise<void> {
    while (cancellationSignal.isUnset) {
      console.log('Processing next product...');
      this.processedProducts++;
      await cancelableTimeout(1000, cancellationSignal);
    }

    console.log('Product processor stopping gracefully.');
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

const simpleTaskModule = new FunctionModule(async (cancellationSignal: CancellationSignal) => {
  console.log('Simple task started.');
  await cancelableTimeout(5000, cancellationSignal);
  console.log('Simple task finished.');
}, 'SimpleTask');
```

#### WebServerModule

The `WebServerModule` starts a fully-featured HTTP server with API routing. It is typically resolved from the dependency injector.

```typescript
import { WebServerModule, configureWebServerModule } from '@tstdl/base/module';
import { Injector } from '@tstdl/base/injector';

// Configure the module (optional, can be done once at application startup)
configureWebServerModule({ port: 3000 });

// Resolve from injector
const injector = new Injector();
const webServerModule = injector.resolve(WebServerModule);

// webServerModule can now be run like any other module.
```

### Running and Stopping a Module

You can manage the lifecycle of any module instance by calling its `run()` and `stop()` methods.

```typescript
import { getShutdownSignal } from '@tstdl/base/process-shutdown';

async function main(): Promise<void> {
  const processor = new ProductProcessorModule();

  // Run the module in the background
  const runPromise = processor.run();
  runPromise.catch(console.error);

  console.log('Product processor is running. Press CTRL+C to stop.');

  // Wait for a shutdown signal
  await getShutdownSignal();

  console.log('Shutdown signal received. Stopping module...');
  await processor.stop();
  await runPromise; // Wait for the module to fully stop
  console.log('Module stopped.');
}

main();
```

### Reporting Metrics

Set up `ModuleMetricReporter` to monitor your modules.

```typescript
import { WebServerModule, ModuleMetricReporter } from '@tstdl/base/module';
import { getShutdownSignal } from '@tstdl/base/process-shutdown';
import { Injector } from '@tstdl/base/injector';

const injector = new Injector();
const webServerModule = injector.resolve(WebServerModule);

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
webServerModule.run();
```

## API Summary

| Class/Interface | Arguments | Description |
| :--- | :--- | :--- |
| `Module` | - | Defines the contract for an application module with a managed lifecycle. |
| `ModuleBase` | `name: string` | Abstract base class for creating modules, handling state and cancellation automatically. |
| `FunctionModule` | `fn: FunctionModuleFunction`, `name?: string` | A simple module implementation that wraps a single asynchronous function. |
| `WebServerModule` | - | A module that starts an HTTP server and API gateway, resolved via dependency injection. |
| `configureWebServerModule()` | `config?: Partial<WebServerModuleConfiguration>` | Configures the default settings for the `WebServerModule`. |
| `ModuleMetricReporter` | `sampleInterval: number`, `sampleCount: number`, `reportEveryNthSample: number` | Samples and reports metrics from registered modules to the console for monitoring. |