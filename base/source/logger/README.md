# Logger

A flexible and extensible logging module for TypeScript applications, designed for clean, structured, and level-based logging with deep integration into dependency injection systems.

## Table of Contents

- [Features](#features)
- [Core Concepts](#core-concepts)
- [Usage](#usage)
  - [Basic Console Logging](#basic-console-logging)
  - [Hierarchical and Scoped Logging](#hierarchical-and-scoped-logging)
  - [Logging Errors](#logging-errors)
  - [Lazy Message Evaluation](#lazy-message-evaluation)
  - [Using with Dependency Injection](#using-with-dependency-injection)
  - [Disabling Logs with NoopLogger](#disabling-logs-with-nooplogger)
- [API Summary](#api-summary)

## Features

- **Multiple Log Levels**: Granular control over log verbosity with levels: `Error`, `Warn`, `Info`, `Verbose`, `Debug`, `Trace`.
- **Console and No-op Implementations**: Includes a `ConsoleLogger` for standard console output and a `NoopLogger` for completely disabling logs.
- **Hierarchical Logging**: Create specialized child loggers using `fork()`, `subModule()`, and `prefix()` to easily trace execution flow and organize output.
- **Dependency Injection Ready**: Designed for seamless integration with `@tstdl/base/injector`, allowing for easy configuration and injection of loggers throughout your application.
- **Lazy Evaluation**: Log messages can be provided as a function (`() => string`) to avoid the cost of string construction if the log level is disabled.
- **Structured Output**: Automatically prefixes logs with a timestamp and optional module/prefix context for clarity.

## Core Concepts

### Logger

The abstract `Logger` class is the foundation of the module. It defines the standard logging API (`.info()`, `.error()`, etc.) and the core level-based filtering logic. All specific logger implementations, like `ConsoleLogger`, extend this class.

### LogLevel

`LogLevel` is a numeric enum that controls the verbosity of the logger. A logger is configured with a specific level, and it will only process messages at that level or a less verbose one (lower numeric value).

The levels are, in order of severity (and numeric value from 0 to 5):

1.  `Error`
2.  `Warn`
3.  `Info`
4.  `Verbose`
5.  `Debug`
6.  `Trace`

For example, a logger set to `LogLevel.Info` will output `Error`, `Warn`, and `Info` messages, but will ignore `Verbose`, `Debug`, and `Trace` messages.

### Implementations

- **`ConsoleLogger`**: The primary, concrete implementation. It writes formatted log entries to the standard `console`. The output includes an ISO timestamp, the module/prefix context, and the log message.
- **`NoopLogger`**: A "no-operation" implementation that discards all log messages. It's useful for silencing logs completely in certain environments, like production or during specific tests, without changing the application code.

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
const userServiceLogger = baseLogger.subModule('UserService');

userServiceLogger.info('Initializing user service.');

function processUser(userId: string) {
  // `prefix()` adds context for a specific operation
  const requestLogger = userServiceLogger.prefix(`[User:${userId}]`);
  requestLogger.debug('Fetching user from database...');
  // ...
  requestLogger.debug('User processing complete.');
}

function runDiagnostics() {
  // `fork()` creates a new logger with a different level and submodule
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
} catch (e) {
  // Logs the error message, stack trace, and any other properties.
  // Options include `includeStack` and `includeRest`.
  logger.error(e, { includeStack: true });
}
```

### Lazy Message Evaluation

To avoid unnecessary string concatenation or computation for logs that won't be displayed, you can pass a function that returns the log message. This function is only executed if the logger's level allows the message to be logged.

```typescript
import { ConsoleLogger, LogLevel } from '@tstdl/base/logger';

const logger = new ConsoleLogger(LogLevel.Info);
const complexDataObject = { id: 42, value: 'test' };

// This function will not be called, saving the JSON.stringify cost
logger.debug(() => `Processing data: ${JSON.stringify(complexDataObject)}`);

// This function WILL be called
logger.info(() => `Processing data for ID: ${complexDataObject.id}`);
```

### Using with Dependency Injection

The `Logger` is designed to be injected. You can register `ConsoleLogger` as the provider for the `Logger` abstract class. You can also provide a global log level using the `LOG_LEVEL` token.

```typescript
import { Injector, inject } from '@tstdl/base/injector';
import { Logger, ConsoleLogger, LogLevel, LOG_LEVEL } from '@tstdl/base/logger';

// Setup DI container
Injector.register(LOG_LEVEL, { useValue: LogLevel.Debug });
Injector.register(Logger, { useToken: ConsoleLogger });

class MyService {
  private readonly logger: Logger;

  constructor() {
    // Inject a logger scoped to this service's name
    this.logger = inject(Logger, 'MyService');
    this.logger.info('MyService initialized.');

    // You can also inject with a configuration object for more control
    const dbLogger = inject(Logger, { module: ['MyService', 'Database'], level: LogLevel.Trace });
    dbLogger.trace('Database connection details...');
  }

  doWork(): void {
    this.logger.debug('Doing important work...');
  }
}

const service = new MyService();
service.doWork();
```

### Disabling Logs with NoopLogger

To disable logging, simply register `NoopLogger` as the implementation for `Logger`. Your application code, which depends on the `Logger` abstraction, remains unchanged.

```typescript
import { Injector, inject } from '@tstdl/base/injector';
import { Logger, NoopLogger } from '@tstdl/base/logger';

// Register NoopLogger to disable all logging
Injector.register(Logger, { useToken: NoopLogger });

class MyService {
  private readonly logger = inject(Logger, 'MyService');

  constructor() {
    // This log message will be ignored
    this.logger.info('MyService initialized, but this will not be logged.');
  }
}

new MyService(); // No output
```

## API Summary

| Class / Method          | Arguments                                                                                    | Returns         | Description                                                                                                   |
| :---------------------- | :------------------------------------------------------------------------------------------- | :-------------- | :------------------------------------------------------------------------------------------------------------ |
| **`Logger`** (abstract) |                                                                                              |                 | The base class for all loggers.                                                                               |
| `constructor`           | `level: LogLevel`, `module?: string \| string[]`, `prefix?: string`                          | `Logger`        | Initializes a new logger.                                                                                     |
| `.error()`              | `entry: string \| (() => string)` <br> or <br> `error: unknown`, `options?: LogErrorOptions` | `void`          | Logs an error object or message at the `Error` level. `options` can include `includeStack` and `includeRest`. |
| `.warn()`               | `entry: string \| (() => string)`                                                            | `void`          | Logs a message at the `Warn` level.                                                                           |
| `.info()`               | `entry: string \| (() => string)`                                                            | `void`          | Logs a message at the `Info` level.                                                                           |
| `.verbose()`            | `entry: string \| (() => string)`                                                            | `void`          | Logs a message at the `Verbose` level.                                                                        |
| `.debug()`              | `entry: string \| (() => string)`                                                            | `void`          | Logs a message at the `Debug` level.                                                                          |
| `.trace()`              | `entry: string \| (() => string)`                                                            | `void`          | Logs a message at the `Trace` level.                                                                          |
| `.fork()`               | `options: LoggerForkOptions`                                                                 | `Logger`        | Creates a new logger instance with optional `level`, `subModule`, and `prefix`.                               |
| `.subModule()`          | `subModule: string`                                                                          | `Logger`        | Creates a new logger for a submodule. Shortcut for `.fork({ subModule })`.                                    |
| `.prefix()`             | `prefix: string`                                                                             | `Logger`        | Creates a new logger with an added prefix, preserving the existing prefix.                                    |
| **`ConsoleLogger`**     |                                                                                              |                 | A `Logger` implementation that writes to the `console`.                                                       |
| `constructor`           | `level: LogLevel`, `module?: string \| string[]`, `prefix?: string`                          | `ConsoleLogger` | Initializes a new console logger.                                                                             |
| **`NoopLogger`**        |                                                                                              |                 | A `Logger` implementation that does nothing.                                                                  |
| `constructor`           |                                                                                              | `NoopLogger`    | Initializes a new no-op logger.                                                                               |
| **`LogLevel`** (enum)   |                                                                                              |                 | A numeric enum for setting log verbosity: `Error`, `Warn`, `Info`, `Verbose`, `Debug`, `Trace`.               |
| **`LOG_LEVEL`** (token) |                                                                                              |                 | An `InjectionToken<LogLevel>` for providing a global log level via DI.                                        |
