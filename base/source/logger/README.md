# Logger

A flexible and extensible logging module for TypeScript applications, designed for clean, structured, and level-based logging with deep integration into dependency injection systems.

## Table of Contents

- [Features](#features)
- [Core Concepts](#core-concepts)
- [Usage](#usage)
  - [Basic Console Logging](#basic-console-logging)
  - [Hierarchical and Scoped Logging](#hierarchical-and-scoped-logging)
  - [Logging Errors](#logging-errors)
  - [Lazy Message Evaluation for Performance](#lazy-message-evaluation-for-performance)
  - [Using with Dependency Injection](#using-with-dependency-injection)
  - [Disabling Logs with NoopLogger](#disabling-logs-with-nooplogger)
- [API Summary](#api-summary)

## Features

- **Multiple Log Levels**: Granular control over log verbosity with levels: `Error`, `Warn`, `Info`, `Verbose`, `Debug`, `Trace`.
- **Hierarchical Logging**: Create specialized child loggers using `fork()`, `subModule()`, and `prefix()` to easily trace execution flow and organize output.
- **Dependency Injection Ready**: Designed for seamless integration with `@tstdl/base/injector`, allowing for easy configuration and injection of loggers throughout your application.
- **Lazy Evaluation**: Log messages can be provided as a function (`() => string`) to avoid the cost of string construction if the log level is not enabled.
- **Structured Output**: `ConsoleLogger` automatically prefixes logs with a timestamp and optional module/prefix context for clarity.
- **Pluggable Implementations**: Includes a `ConsoleLogger` for standard console output and a `NoopLogger` for completely disabling logs.

## Core Concepts

### Logger

The abstract `Logger` class is the foundation of the module. It defines the standard logging API (`.info()`, `.error()`, etc.) and the core level-based filtering logic. All specific logger implementations, like `ConsoleLogger`, extend this class.

### LogLevel

`LogLevel` is a numeric enum that controls the verbosity of the logger. A logger is configured with a specific level, and it will only process messages at that level or a more severe one (lower numeric value).

The levels are, in order of severity (and numeric value from 0 to 5):

1.  `Error` (0)
2.  `Warn` (1)
3.  `Info` (2)
4.  `Verbose` (3)
5.  `Debug` (4)
6.  `Trace` (5)

For example, a logger set to `LogLevel.Info` will output `Error`, `Warn`, and `Info` messages, but will ignore `Verbose`, `Debug`, and `Trace` messages.

### Implementations

- **`ConsoleLogger`**: The primary, concrete implementation. It writes formatted log entries to the standard `console`. The output includes an ISO timestamp, the module/prefix context, and the log message.
- **`NoopLogger`**: A "no-operation" implementation that discards all log messages. It's useful for silencing logs completely in certain environments (like production) or during specific tests without changing application code.

## Usage

### Basic Console Logging

You can instantiate `ConsoleLogger` directly for simple use cases.

```typescript
import { ConsoleLogger, LogLevel } from '@tstdl/base/logger';

const logger = new ConsoleLogger(LogLevel.Info, 'MyModule');

logger.info('Application starting...');
logger.warn('Configuration value is missing, using default.');
logger.debug('This message will be ignored because the level is Info.'); // Ignored
```

### Hierarchical and Scoped Logging

Use `fork()`, `subModule()`, and `prefix()` to create more specific logger instances from a base logger. This is great for adding context and tracing execution flow.

```typescript
import { ConsoleLogger, LogLevel } from '@tstdl/base/logger';

const baseLogger = new ConsoleLogger(LogLevel.Debug, 'App');

// Create a logger for a specific part of your application
const userServiceLogger = baseLogger.subModule('UserService');
userServiceLogger.info('Initializing user service.');

function processUser(userId: string) {
  // `prefix()` adds temporary context for a specific operation
  const requestLogger = userServiceLogger.prefix(`[User:${userId}]`);
  requestLogger.debug('Fetching user from database...');
  // ...
  requestLogger.debug('User processing complete.');
}

function runDiagnostics() {
  // `fork()` creates a new logger with completely different options
  const diagnosticLogger = baseLogger.fork({ subModule: 'Diagnostics', level: LogLevel.Trace });
  diagnosticLogger.trace('Running deep diagnostics...');
}

processUser('123');
runDiagnostics();
```

**Output:**
```
2023-10-27T10:30:00.000Z - [App] [UserService] Initializing user service.
2023-10-27T10:30:01.123Z - [App] [UserService] [User:123] Fetching user from database...
2023-10-27T10:30:01.456Z - [App] [UserService] [User:123] User processing complete.
2023-10-27T10:30:02.000Z - [App] [Diagnostics] Running deep diagnostics...
```

### Logging Errors

The `.error()` method is overloaded to handle both simple strings and `Error` objects, automatically formatting them for clear output.

```typescript
import { ConsoleLogger, LogLevel } from '@tstdl/base/logger';

const logger = new ConsoleLogger(LogLevel.Debug, 'ErrorHandler');

try {
  throw new Error('Something went wrong!');
}
catch (e) {
  // Logs the error message and stack trace.
  logger.error(e, { includeStack: true });
}
```

### Lazy Message Evaluation for Performance

To avoid unnecessary string concatenation or computation for logs that won't be displayed, you can pass a function that returns the log message. This function is only executed if the logger's level allows the message to be logged.

```typescript
import { ConsoleLogger, LogLevel } from '@tstdl/base/logger';

const logger = new ConsoleLogger(LogLevel.Info);
const complexDataObject = { id: 42, value: 'test', data: [1, 2, 3] };

// This function will NOT be called, saving the JSON.stringify cost,
// because the logger's level (Info) is less verbose than the message's level (Debug).
logger.debug(() => `Processing data: ${JSON.stringify(complexDataObject)}`);

// This function WILL be called because the message level (Info) is met.
logger.info(() => `Processing data for ID: ${complexDataObject.id}`);
```

### Using with Dependency Injection

The `Logger` is designed to be injected. You can register `ConsoleLogger` as the provider for the `Logger` abstract class and provide a global log level using the `LOG_LEVEL` token.

```typescript
import { Injector, inject } from '@tstdl/base/injector';
import { Logger, ConsoleLogger, LogLevel, LOG_LEVEL } from '@tstdl/base/logger';

// 1. Configure the DI container
Injector.register(LOG_LEVEL, { useValue: LogLevel.Debug }); // Global default log level
Injector.register(Logger, { useToken: ConsoleLogger }); // Use ConsoleLogger for the Logger abstract class

// 2. Define a service that uses the logger
class ProductService {
  private readonly logger: Logger;

  constructor() {
    // 3. Inject the logger, providing a module name for context
    this.logger = inject(Logger, 'ProductService');
    this.logger.info('ProductService initialized.');
  }

  getProduct(id: string): void {
    const productLogger = this.logger.prefix(`[Product:${id}]`);
    productLogger.debug('Fetching product...');
    // ... logic to fetch product
    productLogger.debug('Product fetched successfully.');
  }
}

const service = new ProductService();
service.getProduct('prod-abc');

// You can also inject with more specific options
const specialLogger = inject(Logger, { module: 'SpecialTask', level: LogLevel.Trace });
specialLogger.trace('This is a very detailed trace message.');
```

### Disabling Logs with NoopLogger

To disable logging, simply register `NoopLogger` as the implementation for `Logger`. Your application code, which depends on the `Logger` abstraction, remains unchanged.

```typescript
import { Injector, inject } from '@tstdl/base/injector';
import { Logger, NoopLogger } from '@tstdl/base/logger';

// In your application's bootstrap file (e.g., for production)
Injector.register(Logger, { useToken: NoopLogger });

class MyService {
  private readonly logger = inject(Logger, 'MyService');

  constructor() {
    // This log message and all others will be silently ignored.
    this.logger.info('This will not appear anywhere.');
  }
}

new MyService(); // No console output
```

## API Summary

### `Logger` (abstract class)

The primary interface for all logging operations.

| Method                  | Signature                                                                                             | Returns  | Description                                                                                                   |
| :---------------------- | :---------------------------------------------------------------------------------------------------- | :------- | :------------------------------------------------------------------------------------------------------------ |
| `constructor`           | `(level: LogLevel, module?: string \| string[], prefix?: string)`                                     | `Logger` | Initializes a new logger instance.                                                                            |
| `error()`               | `(entry: LogEntryOrProvider): void`<br>`(error: unknown, options?: LogErrorOptions): void`              | `void`   | Logs an error object or message. `options` can include `includeStack` and `includeRest`.                    |
| `warn()`                | `(entry: LogEntryOrProvider): void`                                                                   | `void`   | Logs a message at the `Warn` level.                                                                           |
| `info()`                | `(entry: LogEntryOrProvider): void`                                                                   | `void`   | Logs a message at the `Info` level.                                                                           |
| `verbose()`             | `(entry: LogEntryOrProvider): void`                                                                   | `void`   | Logs a message at the `Verbose` level.                                                                        |
| `debug()`               | `(entry: LogEntryOrProvider): void`                                                                   | `void`   | Logs a message at the `Debug` level.                                                                          |
| `trace()`               | `(entry: LogEntryOrProvider): void`                                                                   | `void`   | Logs a message at the `Trace` level.                                                                          |
| `fork()`                | `(options: LoggerForkOptions): Logger`                                                                | `Logger` | Creates a new logger instance with optional `level`, `subModule`, and `prefix`.                               |
| `subModule()`           | `(subModule: string): Logger`                                                                         | `Logger` | Creates a new logger for a submodule. Shortcut for `.fork({ subModule })`.                                    |
| `prefix()`              | `(prefix: string): Logger`                                                                            | `Logger` | Creates a new logger with an added prefix, preserving any existing prefix.                                    |

*`LogEntryOrProvider` is `string | (() => string)`.*

### Other Exports

| Name                | Type                | Description                                                                                           |
| :------------------ | :------------------ | :---------------------------------------------------------------------------------------------------- |
| **`ConsoleLogger`** | `class`             | A `Logger` implementation that writes structured messages to the `console`.                           |
| **`NoopLogger`**    | `class`             | A `Logger` implementation that discards all messages. Ideal for production or tests.                  |
| **`LogLevel`**      | `enum`              | A numeric enum for setting log verbosity: `Error`, `Warn`, `Info`, `Verbose`, `Debug`, `Trace`.         |
| **`LOG_LEVEL`**     | `InjectionToken`    | An injection token (`InjectionToken<LogLevel>`) for providing a global default log level via DI.       |
