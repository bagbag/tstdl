# @tstdl/injector

A powerful, flexible, and type-safe Dependency Injection (DI) framework for TypeScript. It is designed to be ergonomic for developers while offering advanced features to handle complex scenarios like circular dependencies, multiple providers, and asynchronous initialization.

## Table of Contents

- [Features](#features)
- [Core Concepts](#core-concepts)
- [Usage](#usage)
  - [Basic Setup and Injection](#basic-setup-and-injection)
  - [Constructor Injection](#constructor-injection)
  - [Using Injection Tokens for Non-Class Dependencies](#using-injection-tokens-for-non-class-dependencies)
  - [Factory Providers for Complex Logic](#factory-providers-for-complex-logic)
  - [Lifecycle Management](#lifecycle-management)
  - [Asynchronous Initialization with `afterResolve`](#asynchronous-initialization-with-afterresolve)
  - [Handling Circular Dependencies with `forwardRef`](#handling-circular-dependencies-with-forwardref)
  - [Injecting Multiple Implementations](#injecting-multiple-implementations)
  - [Passing Arguments to `resolve`](#passing-arguments-to-resolve)
- [API Summary](#api-summary)

## Features

- **Type-Safe & Decorator-Driven:** Use decorators like `@Injectable` and `@Singleton` to manage your dependencies.
- **Ergonomic Property Injection:** A clean and modern approach using the `inject()` function for property initializers.
- **Flexible Constructor Injection:** Traditional constructor injection is fully supported.
- **Comprehensive Lifecycle Management:** `singleton`, `injector`, `resolution`, and `transient` scopes.
- **Hierarchical Injectors:** Create scoped contexts using `injector.fork()`.
- **Injection Tokens:** Support for non-class dependencies (e.g., interfaces, configuration objects) via `injectionToken()`.
- **Circular Dependency Resolution:** Automatic handling of circular dependencies using `forwardRef`.
- **Asynchronous Initialization:** Perform async setup tasks with `afterResolve` lifecycle hooks.
- **Programmatic Resolution:** Full control over dependency resolution with `injector.resolve()` and `runInInjectionContext()`.

## Core Concepts

### Injector

The `Injector` is the heart of the DI system. It's a container that holds dependency registrations ("providers") and is responsible for creating and providing instances of them. You can create a tree of injectors using `injector.fork()` to establish different scopes.

### Token

A `token` is a key used to identify a dependency. It can be a class constructor or a custom token created with the `injectionToken()` function for non-class dependencies like interfaces or configuration objects.

### Provider

A `provider` is a recipe that tells the injector _how_ to create an instance of a dependency. The module supports several provider types:

- **`useClass`**: The default, creates an instance of a specified class.
- **`useValue`**: Provides a static, pre-existing value.
- **`useFactory`**: Uses a factory function for complex creation logic.
- **`useToken`**: Aliases one token to another, allowing for flexible redirection.

### Lifecycle Scopes

The injector can manage instances with different lifecycles:

- **`transient`** (default): A new instance is created every time it's injected.
- **`singleton`**: A single instance is created and shared across the entire application (scoped to the root injector where it is registered).
- **`injector`**: A single instance is created and shared within the specific injector it was registered in (and its children).
- **`resolution`**: A single instance is created and shared for the duration of a single top-level `resolve()` call (i.e., for the entire resolution tree).

### Injection Context

An "injection context" is active whenever the injector is instantiating a class. The `inject()` function family can only be used within this context (e.g., in property initializers or constructors of `@Injectable` classes). This context-aware nature allows for a clean, declarative syntax without needing to pass the injector instance around.

## Usage

### Basic Setup and Injection

Mark your classes with `@Injectable()` or `@Singleton()` to make them available for dependency injection. Then, use the `inject()` function in a property initializer. This is the recommended approach for its clarity and simplicity.

```typescript
// services/logger.service.ts
import { Singleton } from '@tstdl/injector';

@Singleton()
export class LoggerService {
  log(message: string): void {
    console.log(`[LOG]: ${message}`);
  }
}

// services/user.service.ts
import { inject, Injectable } from '@tstdl/injector';
import { LoggerService } from './logger.service.js';

@Injectable()
export class UserService {
  // `inject()` works because UserService is being instantiated by the injector.
  private readonly logger = inject(LoggerService);

  constructor() {
    this.logger.log('UserService instantiated.');
  }

  getUser(id: number): { id: number; name: string } {
    this.logger.log(`Fetching user ${id}`);
    return { id, name: 'John Doe' };
  }
}

// main.ts
import { Injector } from '@tstdl/injector';
import { UserService } from './services/user.service.js';

// Create a root injector instance
const injector = new Injector('Root');

// Resolve the top-level service. The injector handles creating all dependencies.
const userService = injector.resolve(UserService);
userService.getUser(123);

// Output:
// [LOG]: UserService instantiated.
// [LOG]: Fetching user 123
```

### Constructor Injection

While property injection is recommended, constructor injection is also fully supported. The `@Inject()` decorator is only needed if the type cannot be inferred (e.g., for an interface or token).

```typescript
@Injectable()
export class ProductService {
  private readonly logger: LoggerService;

  constructor(logger: LoggerService) {
    this.logger = logger;
    this.logger.log('ProductService instantiated via constructor.');
  }
}
```

### Using Injection Tokens for Non-Class Dependencies

For configuration or interfaces, use `injectionToken()` to create a unique key.

```typescript
import { inject, Inject, injectionToken, Injectable, Injector } from '@tstdl/injector';

// Define a token and its type
interface ApiConfig {
  url: string;
  apiKey: string;
}
export const API_CONFIG = injectionToken<ApiConfig>('API_CONFIG');

// Register a value provider for the token
const injector = new Injector('Root');
injector.register(API_CONFIG, {
  useValue: {
    url: 'https://api.example.com',
    apiKey: 'secret-key',
  },
});

@Injectable()
class ApiClient {
  // Use the token with inject()
  private readonly config = inject(API_CONFIG);

  // Or use constructor injection with the @Inject() decorator
  constructor(@Inject(API_CONFIG) private readonly configParam: ApiConfig) {
    console.log('API URL:', this.config.url);
    console.log('API Key from param:', this.configParam.apiKey);
  }
}

injector.resolve(ApiClient);
```

### Factory Providers for Complex Logic

Use a factory function when creation logic is complex or depends on other services.

```typescript
import { inject, injectionToken, Injectable, Injector } from '@tstdl/injector';

// Pretend this is a third-party class
class ThirdPartyDbClient {
  constructor(public connectionString: string) {}
}

const DATABASE_URL = injectionToken<string>('DATABASE_URL');
const DATABASE_CLIENT = injectionToken<ThirdPartyDbClient>('DatabaseClient');

const injector = new Injector('Root');
injector.register(DATABASE_URL, { useValue: 'postgres://user:pass@host:5432/db' });

// The factory can use inject() because it runs in an injection context
injector.register(DATABASE_CLIENT, {
  useFactory: () => {
    const url = inject(DATABASE_URL);
    console.log(`Creating database client for ${url}`);
    return new ThirdPartyDbClient(url);
  },
});

@Injectable()
class PetService {
  private readonly dbClient = inject(DATABASE_CLIENT);

  getPetName(): string {
    return 'Fido';
  }
}

injector.resolve(PetService);
```

### Lifecycle Management

Control how many instances of a dependency are created using lifecycles.

```typescript
import { Injectable, Scoped, Singleton, Injector } from '@tstdl/injector';

@Singleton() // One instance for the entire application
class AppConfigService { }

@Scoped('injector') // One instance per injector and its children
class SessionService { }

@Scoped('resolution') // One instance per injector.resolve() resolution tree
class RequestService { }

@Injectable() // New instance every time ('transient' lifecycle)
class TransactionService { }
```

### Asynchronous Initialization with `afterResolve`

To perform initialization logic _after_ a class has been constructed and its dependencies are injected (e.g., for async setup), implement the `Resolvable` interface and use the `[afterResolve]` method.

```typescript
import { Singleton, afterResolve, Resolvable, Injector } from '@tstdl/injector';

@Singleton()
export class DatabaseService implements Resolvable {
  private isConnected = false;

  async [afterResolve]() {
    // This method is called by the injector after instantiation.
    console.log('Connecting to the database...');
    await this.connect(); // some async operation
    this.isConnected = true;
    console.log('Database connected.');
  }

  private async connect(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 50));
  }
}

// At startup, you must use resolveAsync if any dependency has an async hook.
const injector = new Injector('Root');
const dbService = await injector.resolveAsync(DatabaseService);
```

### Handling Circular Dependencies with `forwardRef`

If `ServiceA` depends on `ServiceB`, and `ServiceB` depends on `ServiceA`, the injector can resolve this cycle by using the `forwardRef` option.

```typescript
// service-a.ts
import { inject, Injectable, ForwardRef } from '@tstdl/injector';
import { ServiceB } from './service-b.js';

@Injectable()
export class ServiceA {
  // Using inject() with the forwardRef option breaks the cycle.
  // The injector provides a proxy object initially and replaces it
  // with the real instance once it's available.
  private readonly serviceB = inject(ServiceB, undefined, { forwardRef: true });

  // For constructor injection, use the @ForwardRef decorator
  constructor(@ForwardRef(() => ServiceB) public readonly serviceB: ServiceB) {}

  doSomething() {
    this.serviceB.doSomethingElse();
  }
}

// service-b.ts
import { inject, Injectable } from '@tstdl/injector';
import { ServiceA } from './service-a.js';

@Injectable()
export class ServiceB {
  private readonly serviceA = inject(ServiceA);

  doSomethingElse(): void {
    /* ... */
  }
}
```

### Injecting Multiple Implementations

Register multiple providers for a single token using `{ multi: true }` and inject them as an array using `injectAll()`.

```typescript
import { injectAll, injectionToken, Injectable, Injector } from '@tstdl/injector';

interface Plugin {
  run(): void;
}

export const PLUGIN_TOKEN = injectionToken<Plugin>('PLUGIN_TOKEN');

@Injectable()
class PluginA implements Plugin {
  run() { console.log('PluginA running'); }
}

@Injectable()
class PluginB implements Plugin {
  run() { console.log('PluginB running'); }
}

const injector = new Injector('Root');
injector.register(PLUGIN_TOKEN, { useClass: PluginA }, { multi: true });
injector.register(PLUGIN_TOKEN, { useClass: PluginB }, { multi: true });

@Injectable()
class PluginManager {
  private readonly plugins = injectAll(PLUGIN_TOKEN); // Injects [PluginA, PluginB]

  runPlugins() {
    this.plugins.forEach((p) => p.run());
  }
}

injector.resolve(PluginManager).runPlugins();
```

### Passing Arguments to `resolve`

You can pass an `argument` when resolving a dependency. This argument is available throughout the resolution chain via `injectArgument()`.

```typescript
import { injectArgument, Injectable, Injector, Resolvable } from '@tstdl/injector';

type UserContext = { userId: string };

@Injectable()
export class UserPreferencesService implements Resolvable<UserContext> {
  private readonly context = injectArgument<UserContext>(this);

  getPreferences(): { theme: string } {
    console.log(`Getting preferences for user ${this.context.userId}`);
    return { theme: 'dark' };
  }
}

const injector = new Injector('Root');
const userContext: UserContext = { userId: 'user-42' };

// Pass the context object as the second argument to resolve()
const prefsService = injector.resolve(UserPreferencesService, userContext);
const prefs = prefsService.getPreferences();
```

## API Summary

| Item | Signature | Description |
| :--- | :--- | :--- |
| **Classes** | | |
| `Injector` | `new Injector(name, parent?)` | The main DI container. Manages providers and resolutions. |
| **Injector Methods** | | |
| `injector.register()` | `(token, provider, options?)` | Registers a provider for a token in the injector instance. |
| `injector.fork()` | `(name)` | Creates a child injector, inheriting registrations from its parent. |
| `injector.resolve()` | `(token, argument?, options?)` | Resolves a single instance for a token. |
| `injector.resolveAll()` | `(token, argument?, options?)` | Resolves all providers for a token into an array. |
| `injector.resolveAsync()` | `(token, argument?, options?)` | Asynchronously resolves a token, allowing for async `afterResolve` hooks. |
| **Functions** | | |
| `inject()` | `(token, argument?, options?)` | Injects a dependency within an injection context (e.g., property initializers). |
| `injectAll()` | `(token, argument?, options?)` | Injects all providers registered for a token as an array. |
| `injectArgument()` | `()` | Injects the resolve argument of the current class. |
| `injectionToken()` | `(description)` | Creates a unique token for non-class dependencies. |
| `runInInjectionContext()` | `(injector, fn)` | Runs a function within a specific DI context, enabling the use of `inject()`. |
| **Decorators** | | |
| `@Injectable()` | `(options?)` | Marks a class as available for injection and configures its provider. |
| `@Singleton()` | `(options?)` | Shorthand for `@Injectable({ lifecycle: 'singleton' })`. |
| `@Scoped()` | `(lifecycle, options?)` | Shorthand for `@Injectable({ lifecycle: 'resolution' \| 'injector' })`. |
| `@Inject()` | `(token?, argument?, mapperOrKey?)` | Specifies the token to use for injection, mainly for constructor parameters or non-class types. |
| `@ForwardRef()` | `(token?, argument?)` | Resolves a circular dependency by injecting a proxy that is later replaced with the actual instance. |
| `@Optional()` | `()` | Marks a dependency as optional; injects `undefined` if the token is not found. |
| `@InjectArg()` | `(mapperOrKey?)` | Injects the argument that was passed to `resolve()` for the current class. |
| `@ForwardArg()` | `(mapper?)` | Forwards the parent's resolve argument to a dependency. |
