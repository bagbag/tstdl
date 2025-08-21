# Errors (@tstdl/base/errors)

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
  - [Using the `fast` Option for Performance](#using-the-fast-option-for-performance)
  - [Identifying Errors](#identifying-errors)
- [API Summary](#api-summary)

## Features

- **Extensible Base Class:** `CustomError` provides a solid foundation for creating your own domain-specific error types.
- **Rich Set of Standard Errors:** Includes common HTTP-style and application errors like `NotFoundError`, `ForbiddenError`, and `BadRequestError`.
- **Type Safety:** Use `instanceof` to safely handle specific error types in your `catch` blocks.
- **Detailed Context:** `DetailsError` and `ApiError` allow you to attach structured data or API responses to your errors.
- **Error Aggregation:** `MultiError` simplifies handling scenarios where multiple errors can occur simultaneously.
- **Localization Support:** Built-in structure and default localizations (English and German) to provide user-friendly error messages.
- **Performance-Optimized:** `CustomError` offers a `fast` option to bypass stack trace generation in performance-critical code.

## Core Concepts

### The `CustomError` Base Class

All errors in this module extend the abstract `CustomError` class. It enhances the native `Error` object with several key features:

- A static `errorName` property for reliable identification, which is safe from minification issues that can affect `constructor.name`.
- A standardized constructor that accepts an `options` object, including `message`, `cause`, and a performance-oriented `fast` flag. When `fast` is `true`, the error is constructed without calling `super()`, which avoids capturing a stack trace and can significantly improve performance in hot code paths.

### Standard Error Classes

The module provides a suite of pre-defined error classes for common failure scenarios like HTTP errors, making your code more expressive and self-documenting.

### Specialized Errors

For more complex scenarios, the module includes specialized error types:

- **`DetailsError<T>`:** Attaches a structured `details` object of type `T` to the error, perfect for passing extra context for logging or handling.
- **`MultiError`:** Wraps an array of `Error` objects. This is useful for validation processes or operations that can produce multiple failures at once.
- **`ApiError`:** Designed to wrap an error response from an API call, preserving the original error payload in its `response` property.

### Localization

The module is designed with internationalization in mind. It exports `englishTstdlErrorsLocalization` and `germanTstdlErrorsLocalization`, which provide user-friendly headers and messages for each error type. This allows you to easily integrate error display into a multi-language UI.

## Usage

### Throwing a Standard Error

Import and throw the error that best describes the situation.

```typescript
import { NotFoundError } from '@tstdl/base/errors';
import { ProductRepository } from './product.repository.js';

function getProduct(id: string) {
  const product = ProductRepository.findById(id);

  if (!product) {
    throw new NotFoundError(`Product with ID "${id}" could not be found.`);
  }

  return product;
}
```

### Creating Your Own Custom Error

Extend `CustomError` to create domain-specific errors for your application. Define a static `errorName` for reliable type checking.

```typescript
import { CustomError } from '@tstdl/base/errors';

export class InsufficientStockError extends CustomError {
  static readonly errorName = 'InsufficientStockError';

  constructor(itemId: string, available: number, requested: number) {
    super({
      message: `Not enough stock for item ${itemId}. Available: ${available}, requested: ${requested}.`,
    });
  }
}

// Usage
throw new InsufficientStockError('item-123', 5, 10);
```

### Using the `fast` Option for Performance

In performance-critical code where stack traces are unnecessary, use the `fast: true` option to improve speed by skipping stack trace generation.

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

| Class / Function | Signature | Description |
| :--- | :--- | :--- |
| `CustomError` | `constructor(options?: CustomErrorOptions)` | The abstract base class for all other errors. |
| `ApiError` | `constructor(response: ErrorResponse)` | Wraps an error response from an API, exposing `response` and `details`. |
| `AssertionError` | `constructor(message: string)` | Represents a failed assertion. |
| `BadRequestError` | `constructor(message?: string)` | Indicates a client-side error in the request (HTTP 400). |
| `DetailsError<T>` | `constructor(message: string, details: T)` | An error with an attached `details` payload for extra context. |
| `ForbiddenError` | `constructor(message?: string)` | Indicates insufficient permissions for a resource (HTTP 403). |
| `InvalidCredentialsError` | `constructor(message?: string)` | Indicates incorrect login credentials. |
| `InvalidTokenError` | `constructor(message?: string)` | Indicates an invalid or expired authentication token. |
| `MaxBytesExceededError` | `constructor(message?: string)` | Indicates that a size limit was exceeded. |
| `MaxBytesExceededError.fromBytes` | `(bytes: number): MaxBytesExceededError` | Static factory to create an error with a specific byte limit message. |
| `MethodNotAllowedError` | `constructor(message?: string)` | Indicates an HTTP method is not allowed for a resource (HTTP 405). |
| `MultiError` | `constructor(errors: Error[], message?: string)` | Aggregates multiple `Error` objects into a single error. |
| `NotFoundError` | `constructor(message?: string)` | Indicates that a resource was not found (HTTP 404). |
| `NotImplementedError` | `constructor(message?: string)` | Indicates that a function or feature is not implemented (HTTP 501). |
| `NotSupportedError` | `constructor(message?: string)` | Indicates that an operation or value is not supported. |
| `NotSupportedError.fromEnum` | `(enumeration, name, value): NotSupportedError` | Static factory to create a standard message for an unsupported enum value. |
| `TimeoutError` | `constructor(message?: string)` | Indicates that an operation timed out. |
| `UnauthorizedError` | `constructor(message?: string)` | Indicates that a request requires authentication (HTTP 401). |
| `UnsupportedMediaTypeError` | `constructor(message?: string)` | Indicates that the media type of the request is not supported (HTTP 415). |
| `unwrapError` | `(error: any): any` | A utility to extract the underlying error from a wrapped error object. |
| `germanTstdlErrorsLocalization` | `ErrorsLocalization` | Provides German localizations for the error types. |
| `englishTstdlErrorsLocalization` | `ErrorsLocalization` | Provides English localizations for the error types. |
