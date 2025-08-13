# @tstdl/base/errors

A comprehensive collection of custom, robust, and extensible error classes for TypeScript applications.

## Table of Contents
- [Features](#features)
- [Core Concepts](#core-concepts)
  - [The `CustomError` Base Class](#the-customerror-base-class)
  - [Standard Error Classes](#standard-error-classes)
  - [Specialized Errors](#specialized-errors)
  - [Localization](#localization)
- [Usage](#usage)
  - [Throwing a Standard Error](#throwing-a-standard-error)
  - [Creating Your Own Custom Error](#creating-your-own-custom-error)
  - [Using `DetailsError` for Extra Context](#using-detailserror-for-extra-context)
  - [Handling Multiple Errors with `MultiError`](#handling-multiple-errors-with-multierror)
  - [Identifying Errors](#identifying-errors)
- [API Summary](#api-summary)

## Features

- **Extensible Base Class:** `CustomError` provides a solid foundation for creating your own error types.
- **Rich Set of Standard Errors:** Includes common HTTP-style and application errors like `NotFoundError`, `ForbiddenError`, and `BadRequestError`.
- **Type Safety:** Use `instanceof` to safely handle specific error types in your `catch` blocks.
- **Detailed Context:** `DetailsError` and `ApiError` allow you to attach structured data or API responses to your errors.
- **Error Aggregation:** `MultiError` simplifies handling scenarios where multiple errors can occur.
- **Localization Support:** Built-in structure and default localizations (English and German) to provide user-friendly error messages.
- **Performance-Optimized:** The `CustomError` class offers a `fast` option to bypass the `super()` call for performance-critical scenarios where a stack trace is not needed.

## Core Concepts

### The `CustomError` Base Class

All errors in this module extend `CustomError`. It's an abstract class that enhances the native `Error` object with several key features:
- A static `errorName` property for easy identification without relying on constructor names, which can be mangled during minification.
- A standardized constructor that accepts an `options` object, including `message`, `cause`, and a performance-oriented `fast` flag.

```typescript
export abstract class CustomError extends Error {
  constructor(options: {
    name?: string,
    message?: string,
    stack?: string,
    cause?: Error,
    fast?: boolean
  } = {}) {
    // ... implementation
  }
}
```

### Standard Error Classes

The module provides a suite of pre-defined error classes for common failure scenarios, making your code more expressive and self-documenting.

| Class | Purpose |
| --- | --- |
| `NotFoundError` | An entity or resource was not found. |
| `ForbiddenError`| The user has valid credentials but lacks permission for the action. |
| `UnauthorizedError` | The request requires user authentication. |
| `BadRequestError` | The server cannot process the request due to a client error. |
| `InvalidTokenError` | An authentication token is invalid or has expired. |
| `NotImplementedError`| A feature or method is not yet implemented. |
| `TimeoutError` | An operation exceeded its time limit. |

### Specialized Errors

For more complex scenarios, the module includes specialized error types:

- **`DetailsError<T>`:** Attaches a structured `details` object of type `T` to the error, perfect for passing extra context for logging or handling.
- **`MultiError`:** Wraps an array of `Error` objects. This is useful for validation processes or operations that can produce multiple failures at once.
- **`ApiError`:** Designed to wrap an error response from an API call, preserving the original error payload.

### Localization

The module is designed with internationalization in mind. It exports `englishTstdlErrorsLocalization` and `germanTstdlErrorsLocalization`, which provide user-friendly headers and messages for each error type. This allows you to easily integrate error display into a multi-language UI.

```typescript
// Snippet from errors.localization.ts
export const germanTstdlErrorsLocalization: ErrorsLocalization<TstdlErrors> = {
  language: { code: 'de', name: 'Deutsch' },
  keys: {
    tstdl: {
      errors: {
        NotFoundError: {
          header: 'Nicht gefunden',
          message: (error) => error.message // or a generic message
        },
        ForbiddenError: {
          header: 'Zugriff nicht erlaubt',
          message: 'Sie haben keine Berechtigung für diese Aktion.'
        },
        // ... other error localizations
      }
    }
  }
  // ...
};
```

## Usage

### Throwing a Standard Error

Import and throw the error that best describes the situation.

```typescript
import { NotFoundError } from '@tstdl/base/errors';

function findUser(id: string) {
  const user = database.users.find(id);

  if (!user) {
    throw new NotFoundError(`User with ID "${id}" could not be found.`);
  }

  return user;
}
```

### Creating Your Own Custom Error

Extend `CustomError` to create domain-specific errors for your application.

```typescript
import { CustomError } from '@tstdl/base/errors';

export class InsufficientStockError extends CustomError {
  static readonly errorName = 'InsufficientStockError';

  constructor(itemId: string, available: number, requested: number) {
    super({
      message: `Not enough stock for item ${itemId}. Available: ${available}, requested: ${requested}.`
    });
  }
}

// Usage
throw new InsufficientStockError('item-123', 5, 10);
```

### Using `DetailsError` for Extra Context

Attach a payload to your error for richer logging or handling.

```typescript
import { DetailsError, BadRequestError } from '@tstdl/base/errors';

function validateRequest(payload: any) {
  const validationErrors = getValidationErrors(payload); // returns { field: string, error: string }[]

  if (validationErrors.length > 0) {
    throw new DetailsError(
      'Payload validation failed.',
      { validationErrors }
    );
  }
}
```

### Handling Multiple Errors with `MultiError`

Aggregate several errors and handle them together.

```typescript
import { MultiError } from '@tstdl/base/errors';

async function processBatch(items: Item[]) {
  const errors: Error[] = [];

  for (const item of items) {
    try {
      await processItem(item);
    } catch (error) {
      errors.push(error as Error);
    }
  }

  if (errors.length > 0) {
    throw new MultiError(errors, `Failed to process ${errors.length} items in the batch.`);
  }
}
```

### Identifying Errors

Use `instanceof` for type-safe error handling in `catch` blocks.

```typescript
import { NotFoundError, ForbiddenError, CustomError } from '@tstdl/base/errors';

try {
  // some operation that might fail
} catch (error) {
  if (error instanceof NotFoundError) {
    // Handle resource not found
    console.error('Caught a NotFoundError:', error.message);
  } else if (error instanceof ForbiddenError) {
    // Handle permission denied
    console.error('Caught a ForbiddenError:', error.message);
  } else if (error instanceof CustomError) {
    // Handle any other custom error from the library
    console.error(`Caught a ${error.name}:`, error.message);
  } else {
    // Handle unexpected errors
    console.error('An unknown error occurred:', error);
  }
}
```

## API Summary

This is a summary of the main classes and functions exported by the module.

| Class / Function | Constructor / Signature | Description |
| --- | --- | --- |
| `CustomError` | `constructor(options?: CustomErrorOptions)` | The abstract base class for all other errors. |
| `ApiError` | `constructor(response: ErrorResponse)` | Wraps an error response from an API. |
| `AssertionError`| `constructor(message: string)` | Represents a failed assertion. |
| `BadRequestError`| `constructor(message?: string)` | Indicates a client-side error in the request. |
| `DetailsError<T>`| `constructor(message: string, details: T)` | An error with an attached `details` payload. |
| `ForbiddenError` | `constructor(message?: string)` | Indicates insufficient permissions for a resource. |
| `InvalidCredentialsError` | `constructor(message?: string)` | Indicates incorrect login credentials. |
| `InvalidTokenError`| `constructor(message?: string)` | Indicates an invalid or expired authentication token. |
| `MaxBytesExceededError` | `constructor(message?: string)` | Indicates that a size limit was exceeded. Also has `fromBytes(bytes: number)`. |
| `MethodNotAllowedError` | `constructor(message?: string)` | Indicates an HTTP method is not allowed for a resource. |
| `MultiError` | `constructor(errors: Error[], message?: string)` | Aggregates multiple errors into a single error. |
| `NotFoundError`| `constructor(message?: string)` | Indicates that a resource was not found. |
| `NotImplementedError` | `constructor(message?: string)` | Indicates that a function or feature is not implemented. |
| `NotSupportedError`| `constructor(message?: string)` | Indicates that an operation or value is not supported. Also has `fromEnum(...)`. |
| `TimeoutError` | `constructor(message?: string)` | Indicates that an operation timed out. |
| `UnauthorizedError`| `constructor(message?: string)` | Indicates that a request requires authentication. |
| `UnsupportedMediaTypeError` | `constructor(message?: string)` | Indicates that the media type of the request is not supported. |
| `unwrapError` | `unwrapError(error: any): any` | A utility to extract the underlying error from a wrapped error object. |
| `germanTstdlErrorsLocalization` | `ErrorsLocalization` | Provides German localizations for the error types. |
| `englishTstdlErrorsLocalization` | `ErrorsLocalization` | Provides English localizations for the error types. |