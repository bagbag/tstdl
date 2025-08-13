## Code Style Guide

This guide outlines the coding conventions and best practices for this project. Adhering to these standards ensures code consistency, readability, and maintainability. The project is built on the `@tstdl/base` framework, and many of its conventions are foundational.

### Naming Conventions

- **General:**
  - Use descriptive and meaningful names. Avoid abbreviations.
  - Favor `camelCase` for variables, functions, and object properties.
    ```typescript
    const user = await this.userService.load(id);
    function formatAddress(address: Address) {}
    ```
  - Favor `PascalCase` for classes, types, and enums.
    ```typescript
    class UserService {}
    type UserProfileData = { ... };
    const ProductType = defineEnum('ProductType', {});
    ```
  - Use `UPPER_SNAKE_CASE` for globally significant, exported constants, such as injection tokens.
    ```typescript
    export const MY_APP_DATABASE = injectionToken<...>(...);
    ```
  - For file-local or non-exported constants, `camelCase` is preferred.
    ```typescript
    const userIdKey = 'userId';
    const baseUrl = 'https://api.example.com';
    ```

- **Files:**
  - Use `kebab-case` for filenames.
  - Suffix filenames with their type: `.service.ts`, `.model.ts`, `.api.ts`, `.module.ts`, etc.
    - e.g., `user.service.ts`, `product.model.ts`, `order-creation.api.ts`

- **Private Class Fields:**
  - **Rule:** Always use the hash (`#`) prefix for private fields and methods in classes. This enforces true privacy at runtime.
    ```typescript
    @Singleton()
    export class ProductService extends getRepository(Product) {
      readonly #someService = inject(SomeService);
      readonly #logger = inject(Logger, ProductService.name);
      // ...
    }
    ```

### Comments and Documentation (TSDoc)

- **TSDoc for Public APIs:**
  - Add concise TSDoc comments to all public/exported functions, classes, methods, interfaces, enums and complex types.
  - Focus on the _why_ and any non-obvious behavior.
  - **Rule:** Document the purpose, parameters (`@param`), generic parameters (`@template`) and return values (`@returns`), if they are not immediately obvious.
    ```typescript
    /**
     * Processes a batch of orders from the queue.
     * @param orderIds A list of order IDs, or 'all' to process all pending orders.
     * @param priority The priority level for processing.
     * @param cancellationSignal A signal to gracefully stop the operation.
     */
    async processOrders(orderIds: 'all' | string[], priority: number, cancellationSignal: CancellationSignal): Promise<void> {
      // ...
    }
    ```
- **Avoid Redundant Documentation:**
  - **Rule:** Do not repeat information in TSDoc that is already clear from the type definition.
  - **Good (concise):** `/** The age of the user in years. */`
  - **Bad (redundant):** `/** The user's age, which is a number. */`

- **Inline Comments:**
  - Use inline comments (`//`) to explain complex logic, workarounds, or important context.
  - Use `// TODO:` or `// FIXME:` to mark areas needing future work.

    ```typescript
    // Try to find an existing user record
    const user = await this.#userService.tryLoadByQuery(...);

    // TODO: refactor user permission logic
    ```

### Constants and Enums

- **Avoid Magic Values:**
  - **Rule:** Define magic strings and numbers as named constants to improve readability and maintainability.

- **Enums:**
  - **Rule:** Use the `defineEnum` helper from `@tstdl/base/enumeration` for all enums. This provides better runtime introspection and avoids TypeScript's native enum quirks.

    ```typescript
    export const VehicleType = defineEnum('VehicleType', {
      Car: 'car',
      Truck: 'truck',
      Motorcycle: 'motorcycle',
    });

    export type VehicleType = EnumType<typeof VehicleType>;
    ```

- **Mappings:**
  - For simple key-value mappings, use a `Record<string, T>` or `Record<EnumType, T>`.
    ```typescript
    export const importCodeToVehicleTypeMap: Record<string, VehicleType> = {
      C: VehicleType.Car,
      T: VehicleType.Truck,
    };
    ```

### Functions and Modularity

- **Single Responsibility:**
  - Functions should do one thing well. If a function is too long or complex, decompose it.

- **Helper Functions:**
  - **Rule:** Extract reusable logic into separate, well-named functions.
  - If a helper function is only used within a single file, keep it un-exported and co-located at the bottom of the file. This reduces the public API surface of the module.

    ```typescript

    // (at the end of the file)
    function parseImportedRecord(data: RawImportData): ParsedRecord[] {
      // ... implementation
    }
    ```

### TypeScript Specifics

- **`type` vs. `class`:**
  - **Rule:** Use `class` for data models/entities (e.g., `User`, `Car`) and for injectable services (e.g., `UserService`). Classes are decorated with `@StringProperty`, `@Singleton`, etc., to provide essential runtime metadata for the ORM and dependency injection.

    ```typescript
    // Model
    export class Car extends BaseEntity {
      @StringProperty()
      licensePlate: string;
      // ...
    }

    // Service
    @Singleton()
    export class CarService extends getRepository(Car) {
      // ...
    }
    ```

  - **Rule:** Use `type` for defining API definition shapes (e.g., `UserApiDefinition`), simple data transfer objects (DTOs), unions, intersections, or aliases.
    ```typescript
    export type ResetPasswordMailData = { firstName: string | null; resetPasswordUrl: string };
    export type UserApiDefinition = typeof userApiDefinition;
    ```

- **`any` vs. `unknown`:**
  - Avoid `any`. Prefer `unknown` when a type is not known, as it forces safe type checking.

- **Readonly:**
  - Use `readonly` for properties that should not be changed after initialization to promote immutability.

### Core Architectural Patterns

- **Dependency Injection:**
  - Services are registered as singletons with `@Singleton()` and dependencies are injected via `inject()`.
    ```typescript
    @Singleton()
    export class OrderService {
      readonly #httpClient = inject(HttpClient, { baseUrl });
      private readonly productService = inject(ProductService, undefined, { forwardRef: true });
      // ...
    }
    ```

- **API Definitions:**
  - API endpoints are defined in `source/shared/api/` using `defineApi`. This creates a typed contract shared between the frontend and backend.
  - The corresponding server-side implementation is a class in `source/api/` decorated with `@apiController`.

    ```typescript
    export const userApiDefinition = defineApi({ ... });

    @apiController(userApiDefinition)
    export class UserApi implements ApiController<UserApiDefinition> { ... }
    ```

- **ORM and Repositories:**
  - Data models are defined as classes with ORM decorators (`@Embedded`, `@References`, `@Unique`, etc.).
  - Services that represent a repository should extend `getRepository(Model)`. For other services, repositories can be injected via `injectRepository(Model)`.

    ```typescript
    @Singleton()
    export class UserService extends getRepository(User) { ... }

    @Singleton()
    export class OrderService extends getRepository(Order) {
      readonly #orderItemRepository = injectRepository(OrderItem);
      // ...
    }
    ```

### Imports

- **Order:**
  1.  Node.js built-in modules (e.g., `node:stream`)
  2.  External library imports (e.g., `@tstdl/base`, `luxon`)
  3.  Internal relative and absolute path imports (e.g., `#/services/user.service.js`, `../models/car.model.js`)
  - Separate each group with an empty line.

- **Path Aliases:**
  - Use the `#/` alias for imports outside of the current feature module to avoid long relative paths (`../..`).
  - Use relative paths (`./` or `../`) for imports within the same feature module.

- **File Extensions:**
  - **Rule:** Always include the `.js` extension in all internal imports (both relative and absolute). This is mandatory for native Node.js ESM compatibility.

    ```typescript
    // Good
    import { UserService } from '#/services/user.service.js';
    import { Address } from './address.model.js';

    // Bad
    import { UserService } from '#/services/user.service';
    import { Address } from './address.model';
    ```
