## Code Style Guide

---

### Naming Conventions

- **General:**
  - Use descriptive and meaningful names. Avoid abbreviations.
  - Favor `camelCase` for variables, functions, and object properties.
    ```typescript
    const userName = "Alice";
    function getUserProfile() {}
    ```
  - Favor `PascalCase` for classes, interfaces, types, and enums.
    ```typescript
    class UserServicce {}
    interface UserProfile {}
    type UserId = string | number;
    const UserRole = defineEnum("UserRole", {});
    ```
  - Use `UPPER_SNAKE_CASE` for constants (values that are truly fixed and global or widely used).
    ```typescript
    const MAX_USERS = 100;
    const API_ENDPOINT = "/api/v1";
    ```
- **Files:**
  - Use `kebab-case` for filenames, add a suffix to specify their "type" (e.g., `user.service.ts`, `user-data.model.ts`, `user-data.repository.ts`).

---

### Comments and Documentation (TSDoc)

- **TSDoc for Public APIs:**
  - Add concise TSDoc comments to all public/exported functions, classes, methods, interfaces, types, and enums, etc.
  - Focus _why_ the code exists and any non-obvious behavior or parameters.
  - **Rule:** Document the purpose, parameters (`@param`), and return values (`@returns`) for functions and methods.
    ```typescript
    /**
     * Retrieves a user profile by their ID.
     * @param userId
     * @returns The user's profile object, or undefined if not found.
     */
    export function loadUserProfileById(userId: UserId): UserProfile | undefined {
      // ... implementation
    }
    ```
- **Avoid Redundant Documentation:**
  - **Rule:** Do not repeat documentation in the TSDoc if the information is already clearly conveyed by the TypeScript type definition itself.
  - For example, if a parameter's type clearly indicates its purpose (e.g., `userId: string`), you might not need to explain "the ID of the user" unless there's additional context. Focus on _why_ or any nuances.
  - **Good (concise):**
    ```typescript
    interface UserOptions {
      /** User's preferred language code (e.g., "en", "es"). */
      language: string;
      /** If true, enables dark mode. */
      darkMode: boolean;
    }
    ```
  - **Less good (redundant):**
    ```typescript
    interface UserOptions {
      /** The language for the user. It's a string. */
      language: string; // Type already says it's a string
      /** A boolean indicating if dark mode is on. */
      darkMode: boolean; // Type already says it's a boolean
    }
    ```
- **Inline Comments:**
  - Use inline comments (`//`) to explain complex, non-obvious, or "tricky" parts of the code.
  - Avoid comments that merely restate what the code does (e.g., `// increment i`).
  - TODO comments: Use `// TODO:` or `// FIXME:` to mark areas that need future attention, optionally with a reference to a ticket or your name.

---

### Constants and Enums

- **Avoid Magic Values:**

  - **Rule:** Avoid using "magic numbers" or "magic strings" directly in code. Instead, define them as named constants.
  - This improves readability and makes it easier to update values.
  - **Rule:** If a constant is specific to a single file and not intended for reuse elsewhere, define it within that file. Otherwise, consider a shared `constants.ts` file or placing it near related entities.

    ```typescript
    // Bad
    if (status === 200) {
      /* ... */
    }
    const element = document.getElementById("main-content");

    // Good
    const HTTP_STATUS_OK = 200;
    const MAIN_CONTENT_ID = "main-content";

    if (status === HTTP_STATUS_OK) {
      /* ... */
    }
    const element = document.getElementById(MAIN_CONTENT_ID);
    ```

- **Enums vs. Constants:**

  - **Rule:** Prefer enums when dealing with a small, fixed set of related, named values, especially when these values represent distinct states, types, or categories.

    ```typescript
    const OrderStatus = defineEnum("OrderStatus", {
      Pending = "pending",
      Processing = "processing",
      WaitingForPickup = "waiting-for-pickup",
      Shipped = "shipped",
      Delivered = "delivered",
      Cancelled = "cancelled",
    });

    export type OrderStatus = EnumType<typeof OrderStatus>;

    function processOrder(status: OrderStatus) {
      /* ... */
    }
    ```

  - Use `defineEnum` and `EnumType` as shown above as it adds useful metadata for runtime and avoids TypeScript-native enum quirks.
  - Consider string enums for better debuggability (the string value appears in logs/debuggers instead of a number).
  - For collections of unrelated constants, or where the values are not semantically a "set of options," plain `const` variables are fine.

---

### Functions and Modularity

- **Single Responsibility:**
  - Functions should ideally do one thing well.
  - If a function becomes too long or handles too many concerns, break it down.
- **Extract Utility Code:**
  - **Rule:** Extract "utility code" (reusable logic, complex calculations, data transformations) into separate, well-named functions.
  - This reduces the complexity of the calling function, improves readability, and promotes code reuse.
  - Place these utility functions in appropriate helper files (e.g., `string.utils.ts`, `date.utils.ts`) if they are general-purpose, or keep them co-located if they are specific to a module.
- **Helper Functions, Enums, Types:**
  - **Rule:** Proactively identify and create necessary helper functions, enums, types, or interfaces that improve code clarity, type safety, and reduce duplication.

---

### TypeScript Specifics

- **Type Annotations:**
  - Use explicit type annotations for function parameters, return types, and variable declarations where the type cannot be easily inferred or where it enhances clarity.
  - Rely on type inference where it's clear and doesn't obscure intent.
- **`any` vs. `unknown`:**
  - Avoid `any` as much as possible. It disables type checking.
  - Prefer `unknown` when the type is truly unknown. This forces you to perform type checking before operating on the value.
- **`type` vs. `interface`:**
  - Avoid `interface` for defining the shape of classes. Instead use abstract classes, as they provide runtime information which is useful for dependency injection.
    ```typescript
    abstract class UserService {
      abstract create(name: string): Promise<void>;
    }
    ```
  - Use `type` for defining unions, intersections, tuples, or aliases for primitive types and to define the shape of objects.
    ```typescript
    type ID = string | number;
    type Coordinates = [number, number];
    type Result<T> = { success: true; data: T } | { success: false; error: Error };
    ```
  - Be consistent within the project. If a strong preference emerges, document it.
- **Readonly:**
  - Use `readonly` for properties that should not be reassigned after object creation.
  - Use `Readonly<T>` or `readonly T[]` for immutable collections where appropriate.
    ```typescript
    type Config {
      readonly apiKey: string;
      readonly features: readonly string[];
    }
    ```
- **Decorators:**

  - Use schema decorators to aid runtime validation and ORM.

    ```typescript
    class User extends Entity {
      @StringProperty()
      name: string;

      @Integer()
      age: number;
    }
    ```

---

### Imports

- **Order:**
  1.  Node.js built-in modules (e.g., `node:fs/promises`, `node:path`)
  2.  External library imports (e.g., `drizzle`, `type-fest`)
  3.  Internal relative and absolute path imports (e.g., `#/services/user.service.js`, `../car.model.js`)
  - Separate each group by an empty line.
- **Path Aliases:**
  - Utilize path aliases (e.g., `#/components/...` configured in `tsconfig.json`) for cleaner imports from common directories, avoiding long relative paths like `../../../../components`.
  - Utilize relative paths when importing from inside the same module

---
