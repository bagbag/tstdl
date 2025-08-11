# Injector Module

A powerful, type-safe, and flexible dependency injection (DI) module for TypeScript. It provides a robust framework for managing dependencies, their lifecycles, and their resolution, inspired by modern DI systems.

## Core Concepts

### Injector

The `Injector` is the heart of the system. It maintains a container of **providers** and can create instances of dependencies. Injectors are hierarchical, meaning you can create child injectors (`fork()`) that inherit and can override registrations from their parent.

### Tokens

A **token** is a unique key used to register and resolve a dependency. A token can be:

- A class constructor (e.g., `MyService`).
- An `injectionToken`, created for abstract interfaces or non-class values (e.g., configuration objects).

```typescript
import { injectionToken } from '#/injector/index.js';

// Class as a token
class ApiService {
  /* ... */
}

// InjectionToken for a configuration object
const API_CONFIG = injectionToken<ApiConfig>('API_CONFIG');
```

### Providers

A **provider** is a recipe that tells the injector how to create an instance of a dependency. There are several types of providers:

- `useClass`: The default for `@Injectable`. Creates a new instance of the specified class.
- `useValue`: Binds a token to a pre-existing, static value.
- `useFactory`: Binds a token to the result of a factory function. This is useful for complex initialization logic. The factory can itself receive dependencies.
- `useToken`: Aliases one token to another.

### Lifecycles

The injector can manage the lifecycle of resolved instances:

- `transient` (default): A new instance is created every time the token is resolved.
- `resolution`: A single instance is created and shared within a single `resolve()` call chain.
- `injector`: A single instance is created and shared within the scope of the `Injector` instance that first resolved it.
- `singleton`: A single instance is created and shared across the injector and all its children.

## Key Features

- **Decorator-driven API:** Use decorators like `@Injectable`, `@Singleton`, and `@Inject` for clean and declarative dependency management.
- **Hierarchical Injectors:** Create scoped containers by forking injectors, allowing for modular and isolated dependency graphs.
- **Async Resolution:** First-class support for asynchronous factories and resolution with `resolveAsync()` and `injectAsync()`.
- **Circular Dependency Handling:** A built-in mechanism using `forwardRef` to safely resolve circular dependencies between classes.
- **Lifecycle Hooks:** Provides an `afterResolve` hook for post-initialization logic.
- **Multi-Providers:** Register multiple providers for a single token and resolve them as an array using `injectAll`.
- **Argument-based Scoping:** Create different singleton/scoped instances based on the argument passed during resolution.

## Usage Examples

### Basic Singleton Service

Decorate your service with `@Singleton` to make it available globally as a single instance.

```typescript
// logger.service.ts
import { Singleton } from '#/injector/index.js';

@Singleton()
export class LoggerService {
  log(message: string): void {
    console.log(message);
  }
}
```

### Constructor Injection

Inject dependencies into a class's constructor. The injector automatically resolves the dependencies based on their type or an explicitly provided token.

```typescript
// document-management.api.ts
import { apiController } from '#/api/server/index.js';
import { inject } from '#/injector/index.js';
import { DocumentManagementService } from '../services/index.js';
import { DocumentManagementAuthorizationService } from '../../authorization/index.js';
import { documentManagementApiDefinition } from '../../api/index.js';

@apiController(documentManagementApiDefinition)
export class DocumentManagementApiController {
  // Services are automatically injected by the framework
  readonly #documentManagementService = inject(DocumentManagementService);
  readonly #authorizationService = inject(DocumentManagementAuthorizationService);

  // ... controller logic uses injected services
}
```

### Factory Provider

For complex initializations, use a factory provider. This is often used when configuring a service based on other dependencies or external configuration. Here, we register a `DatabaseConfig` which is resolved from `DocumentManagementConfiguration`.

```typescript
// source/document-management/server/services/singleton.ts
import { Singleton } from '#/injector/decorators.js';
import { factoryProvider } from '#/injector/provider.js';
import { DatabaseConfig } from '#/orm/server/module.js';
import { DocumentManagementConfiguration } from '../module.js';

// A factory provider that resolves the database config
export const documentManagementDatabaseConfigFactoryProvider = factoryProvider((_, context) => context.resolve(DocumentManagementConfiguration).database ?? context.resolve(DatabaseConfig, undefined, { skipSelf: true }));

export const documentManagementDatabaseConfigProvider = {
  provide: DatabaseConfig,
  ...documentManagementDatabaseConfigFactoryProvider,
};

// A custom decorator that applies the Singleton behavior along with the custom provider
export function DocumentManagementSingleton() {
  return Singleton({ providers: [documentManagementDatabaseConfigProvider] });
}
```

### Handling Circular Dependencies with `forwardRef`

When two services depend on each other, you create a circular dependency. The injector can resolve this using `forwardRef`.

```typescript
// document-workflow.service.ts
import { inject } from '#/injector/inject.js';
import { DocumentService } from './document.service.js';

@Singleton()
export class DocumentWorkflowService {
  // DocumentService also depends on DocumentWorkflowService, creating a cycle.
  // forwardRef: true breaks this cycle during resolution.
  private readonly documentService = inject(DocumentService, undefined, { forwardRef: true });

  // ...
}
```

### Multi-Providers with `injectAll`

If you have a common interface with multiple implementations (e.g., a plugin system), you can register them all against a single token and inject them as an array. In our system, different validation strategies (`DocumentValidationExecutor`) are registered against a single token.

```typescript
// document-validation.service.ts
import { injectAll } from '#/injector/inject.js';
import { injectionToken } from '#/injector/token.js';
import type { DocumentValidationExecutor } from '../validators/index.js';

// 1. Define the token
const DOCUMENT_VALIDATION_EXECUTORS = injectionToken<DocumentValidationExecutor>('DocumentValidationExecutors');

// 2. Register multiple implementations (elsewhere in the code)
// Injector.register(DOCUMENT_VALIDATION_EXECUTORS, { useToken: SingleDocumentValidationExecutor }, { multi: true });
// Injector.register(DOCUMENT_VALIDATION_EXECUTORS, { useToken: AnotherValidationExecutor }, { multi: true });

@Singleton()
export class DocumentValidationService {
  // 3. Inject all registered executors as an array
  readonly #executors = injectAll(DOCUMENT_VALIDATION_EXECUTORS);
  readonly #executorMap = new Map(this.#executors.map((executor) => [executor.identifier, executor]));

  // ... uses the map to find the correct executor
}
```

### Programmatic Registration

While decorators are common, you can also register providers programmatically, which is ideal for configuring modules.

```typescript
// configure.ts
import { Injector } from '#/injector/injector.js';
import { DocumentManagementAuthorizationService } from '../authorization/document-management-authorization.service.js';
import { DocumentManagementConfiguration } from './module.js';
import { DocumentManagementAncillaryService } from './services/index.js';

export function configureDocumentManagement(configuration: DocumentManagementConfiguration): void {
  // Register the main configuration object
  Injector.register(DocumentManagementConfiguration, { useValue: configuration });

  // Register services using aliases defined in the configuration
  Injector.register(DocumentManagementAncillaryService, { useToken: configuration.ancillaryService });
  Injector.register(DocumentManagementAuthorizationService, { useToken: configuration.authorizationService });
}
```
