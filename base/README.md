# @tstdl/base - A Comprehensive TypeScript Toolkit

`@tstdl/base` is a modern, modular, and type-safe TypeScript library designed to be a "batteries-included" toolkit for building robust applications, especially on the server-side with Node.js. It provides a rich set of integrated modules that solve common problems, from creating type-safe APIs and interacting with databases to managing application lifecycle and state.

The core philosophy of `@tstdl/base` is to reduce boilerplate, enforce consistency, and enhance developer experience through powerful, type-safe abstractions. Key features like the definition-first API, code-first ORM, and decorator-based dependency injection are designed to create a single source of truth for your application's logic and data structures.

## Core Principles

-   **Modularity**: A collection of independent but cohesive modules that can be used together or individually.
-   **Type-Safety**: Leverages TypeScript to provide strong static typing across all modules, from API clients to database queries.
-   **Code-First & Definition-First**: Define your data models and API contracts once in TypeScript and let the framework generate the necessary boilerplate and ensure consistency.
-   **Dependency Injection**: A powerful, decorator-based DI container at its core, making code more modular, testable, and maintainable.
-   **Asynchronous Primitives**: Built with modern async patterns, including extensive support for `async/await`, `AsyncIterable`, and reactive programming with Signals and RxJS.

## Installation

```bash
npm install @tstdl/base
```

## Features

This library is composed of numerous modules, each providing a specific set of functionalities.

### Application & Core

-   **Application**: Manages the application lifecycle, including startup, shutdown, and module registration.
-   **Module**: A system for organizing the application into manageable, stateful modules with lifecycle hooks.
-   **Injector**: A powerful, decorator-based dependency injection container inspired by Angular, supporting singletons, scoping, and circular dependency resolution.
-   **Logger**: A flexible logging framework with different levels, modules, and backends (e.g., console, no-op).

### Web & API

-   **API Framework**: A declarative, definition-first framework for creating and consuming type-safe HTTP APIs. Define your API contract once to get a typed client and server stubs.
-   **HTTP**: A comprehensive HTTP client (with middleware support) and server implementation for Node.js.
-   **Authentication**: A complete client/server authentication solution with JWTs, sessions, secret management, and impersonation.
-   **OpenID Connect**: A client implementation for OIDC (OAuth 2.0).
-   **Server-Sent Events (SSE)**: Client and server-side utilities for Server-Sent Events.

### Data & Persistence

-   **ORM (Object-Relational Mapper)**: A powerful, code-first ORM built on Drizzle for PostgreSQL, featuring a repository pattern, type-safe queries, transaction management, and transparent column encryption.
-   **Database**: General abstractions for data access patterns (Repository, Entity).
-   **Key-Value Store**: A key-value storage abstraction with different backends (e.g., Mongo, Postgres).
-   **Object Storage**: An abstraction for object storage services like S3/MinIO.
-   **Search Index**: An abstraction for search indexing with backends like Elasticsearch and an in-memory provider.
-   **Migration**: A database migration runner.

### Validation & Serialization

-   **Schema**: A powerful, type-safe schema definition, validation, and parsing library with deep integration into classes via decorators and OpenAPI generation.
-   **Serializer**: A serialization framework for complex objects with cycle detection and support for custom types.
-   **JSON Path**: A utility for querying JSON objects using JSONPath syntax.

### Backend & Concurrency

-   **Queue**: A job queue abstraction with different backends (e.g., Mongo, Postgres) and support for unique jobs, priorities, and batching.
-   **Distributed Loop**: A loop mechanism that runs distributed across multiple processes using locks.
-   **Lock**: A distributed locking mechanism with providers for MongoDB and the Web Lock API.
-   **Threading**: A thread pool implementation for parallel processing using worker threads.
-   **Process**: Utilities for spawning and managing child processes.
-   **Pool**: A generic object pooling implementation for managing reusable resources.

### AI & Document Management

-   **AI Service**: A service for integrating with AI models like Google Gemini, supporting function calling, content generation, and file processing.
-   **Document Management**: A full-featured document management system with a complete workflow for document ingestion, AI-powered classification and extraction, validation, and human-in-the-loop review.

### Frontend & State Management

-   **Signals**: A reactive programming primitive for state management, based on the high-performance Angular Signals implementation.
-   **RxJS Utils**: A collection of useful RxJS operators and utilities for reactive programming.
-   **DOM**: Utilities for DOM interaction, including observers for intersection, mutation, resize, etc.
-   **CSS**: Helpers for programmatically interacting with CSS variables.
-   **Theme**: A theming service for managing and calculating color palettes.

### Templating & Content Generation

-   **Templates**: A flexible templating engine with support for Handlebars, JSX, MJML, and plain strings.
-   **Mail**: A service for sending emails with rich template support.
-   **PDF**: A service for generating PDFs from HTML, URLs, or templates using a headless browser.
-   **JSX**: Server-side JSX rendering capabilities.

### Utilities & Helpers

-   **Collections**: A rich set of advanced, high-performance data structures including observable collections, sorted lists, `AwaitableMap`, and `KeyedSet`.
-   **Enumerable**: A powerful, LINQ-inspired library for querying `Iterable` and `AsyncIterable` collections with a fluent API.
-   **Errors**: A set of custom, serializable error classes (`NotFoundError`, `ForbiddenError`, etc.) for robust and consistent error handling.
-   **Promise**: Advanced promise implementations like `DeferredPromise`, `LazyPromise`, and `CancelablePromise`.
-   **Cancellation**: A `CancellationToken` and `CancellationSignal` implementation for managing async operations.
-   **Disposable**: An implementation of the `Disposable` and `AsyncDisposable` patterns.
-   **Password**: Utilities for password strength checking (zxcvbn) and Have I Been Pwned integration.
-   **Image Service**: An abstraction for image processing and manipulation services like Imgproxy.
-   **Text**: A comprehensive localization service for building multi-language applications.
-   **And many more**: A vast collection of utility functions for arrays, objects, streams, strings, cryptography, date/time manipulation, and more.


## Getting Started

The best way to get started is to explore the `examples/` directory in the repository. It contains practical, runnable examples for many of the core modules, demonstrating how they work together to build a complete application.
