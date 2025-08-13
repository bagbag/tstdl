# DI Injector

A powerful, flexible, and type-safe Dependency Injection (DI) framework for TypeScript. It is designed to be ergonomic for developers while offering advanced features to handle complex scenarios like circular dependencies and asynchronous initialization.

## Features

- **Type-Safe & Decorator-Driven:** Use decorators like `@Injectable` and `@Singleton` to manage your dependencies.
- **Ergonomic Property Injection:** A clean and modern approach using the `inject()` function.
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
- **`singleton`**: A single instance is created and shared across the entire application (within the root injector).
- **`injector`**: A single instance is created and shared within the specific injector it was registered in (and its children).
- **`resolution`**: A single instance is created and shared for the duration of a single top-level `resolve()` call (the entire resolution tree).

### Injection Context

An "injection context" is active whenever the injector is instantiating a class. The `inject()` function family can only be used within this context (e.g., in property initializers or constructors of `@Injectable` classes). This context-aware nature allows for a clean, declarative syntax without needing to pass the injector instance around.

## Usage

### 1. Define Injectable Classes

Mark your classes with `@Injectable()` or the `@Singleton()` shorthand to make them available for dependency injection.

```typescript
// services/logger.service.ts
import { Singleton } from '@tstdl/injector';

@Singleton()
export class LoggerService {
  log(message: string) {
    console.log(`[LOG]: ${message}`);
  }
}
```

### 2. Inject Dependencies

Use the `inject()` function in a property initializer to inject dependencies. This is the recommended approach for its clarity and simplicity.

```typescript
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
```

### 3. Create an Injector and Resolve

At your application's entry point, create a root `Injector` instance and use its `resolve()` method to get a top-level dependency. The injector will build the entire dependency graph.

```typescript
// main.ts
import { Injector } from '@tstdl/injector';
import { UserService } from './services/user.service.js';

// Create a root injector instance
const injector = new Injector('Root');

// Resolve the top-level service. The injector handles creating all dependencies.
const userService = injector.resolve(UserService);

const user = userService.getUser(123);
// Output:
// [LOG]: UserService instantiated.
// [LOG]: Fetching user 123
```

## Advanced Usage

### Custom Providers

For more complex scenarios, like integrating third-party libraries or providing configuration, you can register providers directly on the injector.

#### `useValue`
Provide a static value, perfect for configuration objects.

```typescript
import { injectionToken, Injector } from '@tstdl/injector';

export const API_CONFIG = injectionToken<{ url: string; apiKey: string }>('API_CONFIG');

const injector = new Injector('Root');

injector.register(API_CONFIG, {
  useValue: {
    url: 'https://api.example.com',
    apiKey: 'secret-key'
  }
});
```

#### `useFactory`
Use a factory function when creation logic is complex or depends on other services.

```typescript
import { inject, injectionToken, Injector } from '@tstdl/injector';

const DatabaseClient = injectionToken('DatabaseClient');
const DATABASE_URL = injectionToken<string>('DATABASE_URL');

injector.register(DATABASE_URL, { useValue: 'postgres://...' });

injector.register(DatabaseClient, {
  useFactory: () => {
    // The inject function can be used inside a factory
    const url = inject(DATABASE_URL);
    return createDbClient(url); // Assumes createDbClient is some setup function
  }
});
```

### Constructor Injection

While property injection is recommended, constructor injection is also fully supported. The `@Inject()` decorator is only needed if the type cannot be inferred (e.g., for an interface or token).

```typescript
@Injectable()
export class MyService {
  constructor(
    private readonly logger: LoggerService, // Type is a class, no decorator needed
    @Inject(API_CONFIG) private readonly config: ApiConfig // Type is a token, @Inject is required
  ) {}
}
```

### Lifecycle Hooks (`afterResolve`)

To perform initialization logic *after* a class has been fully constructed and its dependencies injected (e.g., for async setup), you can use an `afterResolve` hook.

```typescript
import { Singleton, afterResolve, Resolvable, Injector } from '@tstdl/injector';

@Singleton()
export class DatabaseService implements Resolvable {
  private isConnected = false;

  async [afterResolve]() {
    // This method is automatically called by the injector after instantiation.
    // Use `resolveAsync` if any hook is async.
    console.log('Connecting to the database...');
    await this.connect();
    this.isConnected = true;
    console.log('Database connected.');
  }

  private async connect(): Promise<void> {
    // connection logic...
  }
}

// At startup:
const injector = new Injector('Root');
const dbService = await injector.resolveAsync(DatabaseService); // Use resolveAsync
```

### Circular Dependencies (`forwardRef`)

If `ServiceA` depends on `ServiceB`, and `ServiceB` depends on `ServiceA`, the injector can resolve this using `{ forwardRef: true }`.

```typescript
// service-a.ts
@Injectable()
export class ServiceA {
  // `forwardRef` breaks the cycle. The injector provides a proxy object
  // initially and replaces it with the real instance once it's available.
  private readonly serviceB = inject(ServiceB, undefined, { forwardRef: true });

  doSomething() {
    this.serviceB.doSomethingElse();
  }
}

// service-b.ts
@Injectable()
export class ServiceB {
  private readonly serviceA = inject(ServiceA);

  doSomethingElse() { /* ... */ }
}
```

### Hierarchical Injectors

Create child injectors using `injector.fork('child-name')`. When a child injector resolves a token, it first checks its own registrations. If not found, it asks its parent. This is useful for creating scoped instances, like for a web request.

```typescript
const rootInjector = new Injector('Root');
rootInjector.register(LoggerService, { useClass: LoggerService });

// Each request gets its own injector inheriting from the root
const requestInjector = rootInjector.fork('Request 1');
requestInjector.register(UserService, { useClass: UserService }); // transient by default

const logger = requestInjector.resolve(LoggerService); // Resolved from rootInjector
const userService = requestInjector.resolve(UserService); // Resolved from requestInjector
```

### Multiple Implementations (`multi: true`)

Register multiple providers for a single token and inject them as an array using `injectAll()`.

```typescript
// tokens.ts
export const PLUGIN = injectionToken<Plugin>('PLUGIN');

// registration
injector.register(PLUGIN, { useClass: PluginA }, { multi: true });
injector.register(PLUGIN, { useClass: PluginB }, { multi: true });

// injection
@Singleton()
class PluginManager {
  private readonly plugins = injectAll(PLUGIN); // Injects [PluginA, PluginB]

  runPlugins() {
    this.plugins.forEach(p => p.run());
  }
}
```

### Programmatic Injection (`runInInjectionContext`)

The `inject()` function only works within an active injection context. To create a context programmatically, use `runInInjectionContext()`.

```typescript
import { Injector, runInInjectionContext, inject } from '@tstdl/injector';

const injector = new Injector('Root');
// ... register providers ...

function doWork() {
  const userService = inject(UserService);
  userService.getUser(1);
}

// Run doWork within the context of our injector
runInInjectionContext(injector, doWork);
```

## API Reference

### Decorators

- `@Injectable(options?)`: Marks a class as available for injection.
- `@Singleton(options?)`: Shorthand for `@Injectable({ lifecycle: 'singleton' })`.
- `@Scoped(lifecycle, options?)`: Shorthand for `@Injectable({ lifecycle: 'injector' | 'resolution' })`.
- `@Inject(token?, arg?, mapper?)`: Specifies a token to inject for a constructor parameter or property.
- `@InjectAll(token?, arg?, mapper?)`: Injects all providers for a token as an array.
- `@Optional()`: Marks a dependency as optional. If not found, `undefined` is injected.
- `@ForwardRef()`: Used to resolve a circular dependency.
- `@InjectArg(mapper?)`: Injects the argument that was passed to `resolve()` for the current class.
- `@ForwardArg(mapper?)`: Forwards the parent's resolve argument to a dependency.

### Core API

- `Injector`: The main DI container class.
  - `new Injector(name, parent?)`: Creates a new injector.
  - `register(token, provider, options?)`: Registers a provider.
  - `resolve<T>(token, argument?, options?)`: Resolves a single instance for a token.
  - `resolveAsync<T>(...)`: Resolves a token, allowing for async `afterResolve` hooks.
  - `resolveAll<T>(...)`: Resolves all providers for a token into an array.
  - `resolveMany(...tokens)`: Resolves multiple different tokens at once for efficiency.
  - `fork(name)`: Creates a child injector.
- `injectionToken<T>(description)`: Creates a unique token for non-class dependencies.
- `inject<T>(token, argument?, options?)`: Injects a dependency within an injection context.
- `injectAll<T>(...)`: Injects multiple providers for a token within an injection context.
- `injectArgument<T>()`: Injects the resolve argument of the current class.
- `runInInjectionContext(injector, fn)`: Runs a function within a specific DI context, enabling the use of `inject()`.