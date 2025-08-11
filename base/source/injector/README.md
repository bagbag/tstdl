# Injector

The `@tstdl/base/injector` module provides a powerful, flexible, and type-safe Dependency Injection (DI) system for TypeScript. It is designed to be ergonomic for developers while offering advanced features to handle complex scenarios like circular dependencies and asynchronous initialization.

## Table of Contents

- [Core Concepts](#core-concepts)
  - [Injector](#injector)
  - [Token](#token)
  - [Provider](#provider)
  - [Lifecycle Scopes](#lifecycle-scopes)
- [Basic Usage](#basic-usage)
  - [1. Making a Class Injectable](#1-making-a-class-injectable)
  - [2. Injecting Dependencies](#2-injecting-dependencies)
- [Advanced Topics](#advanced-topics)
  - [Providers in Detail](#providers-in-detail)
  - [Injection Tokens for Non-Class Dependencies](#injection-tokens-for-non-class-dependencies)
  - [Handling Circular Dependencies](#handling-circular-dependencies)
  - [Lifecycle Hooks (`afterResolve`)](#lifecycle-hooks-afterresolve)
  - [Hierarchical Injectors](#hierarchical-injectors)
  - [Resolving Dependencies Programmatically](#resolving-dependencies-programmatically)
  - [Optional Dependencies](#optional-dependencies)
  - [Injecting Multiple Implementations](#injecting-multiple-implementations)
- [API Summary](#api-summary)

## Core Concepts

### Injector

The `Injector` is the heart of the DI system. It's a container that holds dependency registrations and is responsible for creating and providing instances of them. Typically, a single root injector is created at the application's startup.

### Token

A `token` is a key used to identify a dependency. It can be a class constructor or a custom token created with the `injectionToken()` function for non-class dependencies like interfaces or configuration objects.

### Provider

A `provider` is a recipe that tells the injector _how_ to create an instance of a dependency. The module supports several provider types:

- **`useClass`**: The default provider, creates an instance of a class.
- **`useValue`**: Provides a static value.
- **`useFactory`**: Uses a factory function to create the instance, allowing for complex logic.
- **`useToken`**: Aliases one token to another.

### Lifecycle Scopes

The injector can manage instances with different lifecycles:

- **`transient`** (default): A new instance is created every time it's injected.
- **`singleton`**: A single instance is created and shared across the entire injector tree.
- **`injector`**: A single instance is created and shared within the injector it was registered in (and its children).
- **`resolution`**: A single instance is created and shared for the duration of a single `resolve` call (the resolution tree).

## Basic Usage

### 1. Making a Class Injectable

To make a class available for injection, use the `@Injectable()` or `@Singleton()` decorator. `@Singleton()` is a shorthand for `@Injectable({ lifecycle: 'singleton' })`.

```typescript
// source/services/core/user.service.ts
import { Singleton } from '@tstdl/base/injector';
import { getRepository } from '@tstdl/base/orm/server';
import { User } from '#/shared/models/core/user.model.js';

@Singleton()
export class UserService extends getRepository(User) {
  // ... service logic
}
```

### 2. Injecting Dependencies

Dependencies can be injected into a class's constructor or as properties.

#### Property Injection (Recommended)

Property injection is clean and straightforward. Use the `inject()` function to initialize class properties.

```typescript
// source/services/core/device.api.ts
import { inject } from '@tstdl/base/injector';
import { DeviceService } from '#/services/core/index.js';

@apiController(deviceApiDefinition)
export class DeviceApi implements ApiController<DeviceApiDefinition> {
  readonly deviceService = inject(DeviceService);

  // ... controller logic
}
```

#### Constructor Injection

While property injection is often cleaner, constructor injection is also fully supported.

```typescript
import { Singleton, inject } from '@tstdl/base/injector';
import { OtherService } from './other.service';
import { AnotherService } from './another.service';

@Singleton()
export class MyService {
  readonly #otherService: OtherService;
  readonly #anotherService: AnotherService;

  constructor(
    otherService: OtherService,
    /**
     * `@Inject` decorator is required to specify the token when the type cannot be retrieved via reflection (e.g. when using interfaces)
     */
    @Inject(AnotherService) anotherService: AnotherService,
  ) {
    this.#otherService = otherService;
    this.#anotherService = anotherService;
  }
}
```

## Advanced Topics

### Providers in Detail

While decorators are convenient, you can manually register providers with the injector, which is especially useful for configuration, third-party libraries, or complex initializations.

- **`useValue`**: Provide a constant value. Ideal for configuration objects.

  ```typescript
  // source/bootstrap.ts
  Injector.registerSingleton(MyServiceConfiguration, {
    useValue: {
      baseUrl: 'https://dev-aep.assetapp.de/api/external',
      user: assertDefinedPass(environment.user),
      password: assertDefinedPass(environment.password),
    },
  });
  ```

- **`useFactory`**: Use a function to create the dependency. This is powerful for dependencies that require complex setup logic or need other dependencies to be created.

  ```typescript
  // source/bootstrap.ts
  Injector.registerSingleton(MYSQL_DATABASE, {
    useFactory: (argument, context) => {
      assertDefined(argument?.database, 'Missing database argument');

      const pool = createPool({
        /* ... credentials ... */
      });

      return pool;
    },
    async afterResolve(_value, _argument, context) {
      // Connect after the instance is created
      await connect('the-database-name' /* ... */);
    },
  });
  ```

### Injection Tokens for Non-Class Dependencies

When you need to inject an interface, a configuration object, or a primitive value, you can't use a class as the token. In these cases, create a custom token using `injectionToken()`.

1.  **Define the token:**

    ```typescript
    // source/tokens.ts
    import { injectionToken } from '@tstdl/base/injector';

    type Secrets = {
      tokenSigningSecret: Uint8Array;
      refreshTokenSigningSecret: Uint8Array;
      // ...
    };

    export const SECRETS = injectionToken<Secrets>('SECRETS');
    ```

2.  **Register a provider for the token:**

    ```typescript
    // source/bootstrap.ts
    import { SECRETS } from './tokens.js';

    // ... derive secrets ...
    const secrets = { tokenSigningSecret /* ... */ };
    Injector.registerSingleton(SECRETS, { useValue: secrets });
    ```

3.  **Inject the value using the token:**

    ```typescript
    // source/services/core/user-registration.service.ts
    import { SECRETS } from '#/tokens.js';

    @Singleton()
    export class SomeService {
      readonly #secrets = inject(SECRETS);

      doSomething() {
        const secret = this.#secrets.tokenSigningSecret;
        // ...
      }
    }
    ```

### Handling Circular Dependencies

A circular dependency occurs when `ServiceA` depends on `ServiceB`, and `ServiceB` depends on `ServiceA`. This creates an infinite loop during instantiation. The injector can resolve this using `forwardRef`.

Pass `{ forwardRef: true }` to the `inject()` function on one side of the circular dependency.

Behind the scenes, the injector keeps track of all unresolved dependencies and their injection contexts. When it encounters a circular dependency, it temporarily resolves the dependency to a proxy and continues with the injection process. Once all dependencies are resolved, it tries to replaces the proxy with the actual instances. Replacements only works for class fields that are *not* js-private (`#field`). If it cannot replace a proxy with an actual instance, the proxy will forward every interaction to the actual instance.

```typescript
// source/services/core/device.service.ts
import { inject, Singleton } from '@tstdl/base/injector';
import { GatewayService } from './gateway.service.js';

@Singleton()
export class DeviceService extends getRepository(Device) {
  // GatewayService depends on DeviceService, creating a cycle.
  // forwardRef breaks this cycle during instantiation.
  readonly #gatewayService = inject(GatewayService, undefined, { forwardRef: true });
}
```

### Lifecycle Hooks (`afterResolve`)

Sometimes, you need to perform initialization logic _after_ an instance has been created and all its dependencies have been injected. You can achieve this in two ways:

1.  **On the registration options:** The `afterResolve` callback is perfect for setup logic within factories.

    ```typescript
    // source/bootstrap.ts
    Injector.registerSingleton(ERAS_DATABASE, {
      useFactory: (argument, context) => {
        /* ... create instance ... */
      },
      async afterResolve(instance, argument, context) {
        // This runs after the drizzle instance is created.
        // `instance` is the created database client.
        await connect('eras2-database', async () => {
          /* ... */
        });
      },
    });
    ```

2.  **On the class itself:** Implement the `Resolvable` interface and the `[afterResolve]` method or the `registerAfterResolve()` function.

    ```typescript
    import { Singleton, afterResolve, Resolvable } from '@tstdl/base/injector';

    @Singleton()
    export class MyService implements Resolvable {
      constructor() {
        registerAfterResolve(this, async (argument) => {
          // Initialization logic can go here
        });
      }

      async [afterResolve]() {
        // Initialization logic can go here
        console.log('MyService has been created and injected.');
      }
    }
    ```

### Hierarchical Injectors

You can create child injectors using `injector.fork('child-name')`. When resolving a dependency, the injector first checks its own registrations. If a provider isn't found, it delegates the request to its parent injector. This is useful for creating scoped dependencies, such as per-request instances in a web server.

### Resolving Dependencies Programmatically

Outside of a injection context (e.g., in a script or bootstrap file), you can resolve dependencies directly from an injector instance using `resolve()` or `resolveAsync()`.

```typescript
// source/tools/create-tenant-admin.ts
import { Application } from '@tstdl/base/application';
import { inject, injectManyAsync } from '@tstdl/base/injector';

async function main(): Promise<void> {
  const service1 = inject(Service1);
  const [service2, service3] = await injectManyAsync(Service2, Service3);

  // ... use the services
}

Application.run(main);
```

### Optional Dependencies

If a dependency might not be registered, use the `@Optional()` decorator or `{ optional: true }` option. If the token isn't found, `undefined` will be injected.

```typescript
import { inject, Optional, Singleton } from '@tstdl/base/injector';

@Singleton()
export class MyService {
  readonly logger = inject(Logger, undefined, { optional: true });

  constructor(@Optional() private readonly logger?: Logger) {}
}
```

### Injecting Multiple Implementations

If you have multiple providers registered for the same token (using the `{ multi: true }` option), you can inject all of them as an array using `@InjectAll()` or `injector.resolveAll()`.

```typescript
interface Plugin {
  initialize(): void;
}

const PLUGIN_TOKEN = injectionToken<Plugin>('PLUGIN_TOKEN');

// Registration
Injector.register(PLUGIN_TOKEN, { useClass: PluginA }, { multi: true });
Injector.register(PLUGIN_TOKEN, { useClass: PluginB }, { multi: true });

// Injection
@Singleton()
class PluginManager {
  readonly #plugins = injectAll(PLUGIN_TOKEN); // Injects [PluginA, PluginB]

  initializeAll() {
    for (const plugin of this.#plugins) {
      plugin.initialize();
    }
  }
}
```

## API Summary

**Decorators:**

- `@Injectable(options)`: Marks a class for DI.
- `@Singleton(options)`: Marks a class for DI with a singleton lifecycle.
- `@Scoped(lifecycle, options)`: Marks a class for DI with a scoped lifecycle.
- `@Inject(token?, arg?, mapper?)`: Injects a dependency into a property or constructor parameter.
- `@InjectAll(token?, arg?, mapper?)`: Injects all providers for a token as an array.
- `@Optional()`: Marks a dependency as optional.
- `@ForwardRef()`: Resolves a circular dependency.

**Functions:**

- `injectionToken<T>(description)`: Creates a token for non-class dependencies.
- `inject<T>(token, options?)`: Programmatically injects a dependency within an injection context.
- `runInInjectionContext(injector, fn)`: Runs a function within a specific DI context.

**Injector Methods:**

- `register(token, provider, options?)`: Registers a provider.
- `resolve<T>(token, options?)`: Resolves a single instance of a token.
- `resolveAll<T>(token, options?)`: Resolves all instances for a token.
- `resolveMany(...tokens)`: Resolves multiple different tokens at once.
- `fork(name)`: Creates a child injector.
