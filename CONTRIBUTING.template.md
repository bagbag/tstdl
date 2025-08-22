# Contributing to [Project Name]

This guide provides everything you need to get started with the project, from setting up your local environment to understanding our coding conventions and submitting your work.

### Table of Contents

1.  [Project Structure](#project-structure)
2.  [About `tstdl`](#about-tstdl)
3.  [Prerequisites](#prerequisites)
4.  [Environment Setup](#environment-setup)
    - [Backend Server (`server/`)](#backend-server-server)
    - [Frontend Application (`client/`)](#frontend-application-client)
    - [Templates Application (`templates/`)](#templates-application-templates)
5.  [Full Stack Development Workflow](#full-stack-development-workflow)
6.  [Code Style and Conventions](#code-style-and-conventions)
    - [General Conventions](#general-conventions)
    - [Shared Code Architecture](#shared-code-architecture)
    - [Backend (@tstdl/base)](#backend-tstdlbase)
    - [Frontend (Angular)](#frontend-angular)
7.  [Version Control](#version-control)

---

## Project Structure

The project is divided into three main parts, each in its own directory:

- `server/`: The Node.js backend application built with TypeScript.
- `client/`: The main Angular frontend application.
- `templates/`: A separate Angular SSR application used by the server to generate documents like PDFs.

You will need to run all three applications concurrently for a full local development experience.

## About `tstdl`

This project is built upon `tstdl`, a custom-developed framework that provides a foundation for both the backend and frontend applications. Understanding its role is key to contributing effectively.

**What is `tstdl`?**

`tstdl` is a collection of libraries and modules that offer common functionalities, patterns, and base components used throughout the project codebase. It aims to standardize development and reduce boilerplate code. You will see its packages (`@tstdl/base`, `@tstdl/angular`) imported frequently.

When contributing it is essential to understand how `tstdl` works and how to use its components effectively. Familiarize yourself with its documentation to see examples of usage.

## Prerequisites

Before you begin, ensure you have the following tools installed on your system:

- **Node.js and npm**: We recommend using the latest or latest LTS version.
- **Podman or Docker and Podman/Docker Compose**: For running required services like databases and object storage.

## Environment Setup

Follow the steps below to set up each part of the application.

### Backend Server (`server/`)

1.  **Install Dependencies**
    Navigate to the server directory and install the necessary npm packages.

    ```bash
    cd server
    npm ci
    ```

2.  **Services (Databases & Storage)**
    The server requires a PostgreSQL database and an S3-compatible object storage service (like MinIO). The easiest way to run these is using Docker Compose. From the project root, run:

    ```bash
    docker-compose up -d
    ```

3.  **Environment Variables**
    The server uses environment variables for configuration. The defaults are enough for basic development. Some specific features like third-party integrations require additional configuration.

4.  **Database Migrations**
    Database migrations are automatically run when the server starts.

    To generate new migrations after modifying the models, build the server and then run:

    ```bash
    # From the server/ directory
    npm run generate:migration
    ```

5.  **Running the Server**
    For development, you can run the build in watch mode and start the server. This provides auto-reloading on changes.

    ```bash
    # In one terminal, from server/
    npm run build:watch

    # In another terminal, from server/
    npm run start
    ```

    The server will be available at `http://localhost:8000`.

6.  **Seeding Initial Mock Data**
    If a bootstrap environment variable (e.g., `BOOTSTRAP_DATA="true"`) is set, the server will create default data on the first run, which is usually enough for daily development. For more control, you can use the provided tools after the server is running:

    ```bash
    # From the server/ directory
    npm run build

    # Example: Create a new user
    node dist/tools/create-user.js
    ```

### Frontend Application (`client/`)

1.  **Install Dependencies**

    ```bash
    cd client
    npm ci
    ```

2.  **Running the Client**
    Start the Angular development server. It will automatically connect to the backend running on port 8000.

    ```bash
    # From the client/ directory
    npm start
    ```

    The client application will be available at `http://localhost:4200`.

### Templates Application (`templates/`)

This application is used by the server to generate PDF documents. It must be running for features like document generation to work. It is not intended for direct user interaction.

1.  **Install Dependencies**

    ```bash
    cd templates
    npm ci
    ```

2.  **Running the Templates App**
    Start the development server. By default, it runs on port 4201.
    ```bash
    # From the templates/ directory
    npm start
    ```
    The templates app will be available at `http://localhost:4201`.

## Full Stack Development Workflow

To run the entire platform locally, you'll need three or more separate terminal sessions:

1.  **Terminal 1: Start Backend Services**

    ```bash
    # From the project root
    docker-compose up -d # or without -d to run in the foreground
    ```

2.  **Terminal 2: Start the Backend Server Compilation**

    ```bash
    cd server
    npm run build:watch
    ```

3.  **Terminal 3: Start the Backend Server**

    ```bash
    cd server
    npm run start
    ```

4.  **Terminal 4: Start the Frontend Client**

    ```bash
    cd client
    npm start
    ```

5.  **Terminal 5: Start the Templates App** (Only required for document generation)

    ```bash
    cd templates
    npm start
    ```

Once all services are running, you can access the application at `http://localhost:4200`. Happy coding!

---

## Code Style and Conventions

This section outlines the coding conventions and best practices for this project. Adhering to these standards ensures code consistency, readability, and maintainability.

### General Conventions

These conventions apply to both the backend and frontend parts of the codebase.

#### Naming Conventions

- **General:**
  - Use descriptive and meaningful names. Avoid abbreviations.
  - Use `camelCase` for variables, functions, and object properties.
  - Use `PascalCase` for classes, types and interfaces.
  - Use `UPPER_SNAKE_CASE` for globally significant, exported constants like injection tokens.
  - For file-local or non-exported constants, `camelCase` is preferred.
    ```typescript
    const user = await this.userService.load(id);
    function formatAddress(address: Address) {}
    class UserService {}
    type UserProfileData = { ... };
    export const MY_APP_CONFIG = injectionToken<...>(...);
    const baseUrl = 'https://api.example.com';
    ```

- **Files:**
  - Use `kebab-case` for filenames.
  - Suffix filenames with their type: `.service.ts`, `.model.ts`, `.api.ts`, `.component.ts`, etc.
    - e.g., `user.service.ts`, `product.model.ts`, `order-creation.api.ts`, `login-page.component.ts`

#### Comments and Documentation (TSDoc)

- **TSDoc for Public APIs:**
  - Add concise TSDoc comments to all public/exported functions, classes, methods, interfaces, enums and complex types.
  - Focus on the _why_ and any non-obvious behavior.
  - **Rule:** Document the purpose, parameters (`@param`),generic parameters (`@template`) and return values (`@returns`) if they are not self-evident.
- **Avoid Redundant Documentation:**
  - **Rule:** Do not repeat information in TSDoc that is already clear from the type definition.
  - **Good (concise):** `/** Timestamp in seconds. */`
  - **Bad (redundant):** `/** The user's age, which is a number. */`

- **Inline Comments:**
  - Use inline comments (`//`) to explain complex logic, workarounds, or important context. Use `// TODO:` or `// FIXME:` to mark areas needing future work.

#### Constants and Enums

- **Avoid Magic Values:**
  - **Rule:** Define magic strings and numbers as named constants to improve readability and maintainability.

- **Enums:**
  - **Rule:** Use the `defineEnum` helper from `@tstdl/base/enumeration` for all enums. This provides better runtime introspection and avoids TypeScript's native enum quirks.

  ```typescript
  import { defineEnum, EnumType } from '@tstdl/base/enumeration';

  export const VehicleType = defineEnum('VehicleType', {
    Car: 'car',
    Truck: 'truck',
    Motorcycle: 'motorcycle',
  });

  export type VehicleType = EnumType<typeof VehicleType>;
  ```

#### Imports

- **Order:**
  1.  Node.js built-in modules (e.g., `node:path`)
  2.  External library imports (e.g., `@angular/core`, `@tstdl/base`, `luxon`)
  3.  Internal absolute path imports using the `#/` alias.
  4.  Internal relative path imports (`./` or `../`).
  - Separate each group with an empty line.

- **Path Aliases:**
  - Use the `#/` alias for imports outside of the current feature module to avoid long relative paths.
  - Use relative paths (`./` or `../`) for imports within the same feature module.

- **File Extensions:**
  - **Rule:** Always include the `.js` extension in all internal backend imports. This is mandatory for native Node.js ESM compatibility.
  - **Rule:** Do not include file extensions for internal frontend (Angular) imports.

  ```typescript
  // Good (Server)
  import { UserService } from '#/services/user.service.js';
  import { Address } from './address.model.js';

  // Good (Client)
  import { SessionService } from '#/modules/core/services';
  import { ButtonComponent } from '../button/button.component';
  ```

#### Private Class Fields

- **Rule:** Always use the hash (`#`) prefix for private fields and methods in classes. This enforces true privacy at runtime.

```typescript
import { Singleton, inject, injectRepository } from '@tstdl/base/injector';

@Singleton()
export class ProductService {
  readonly #productRepository = injectRepository(Product);
  readonly #logger = inject(Logger, ProductService.name);
  // ...
}
```

#### Type Safety

- **Explicit types:**
  - Use explicit types instead of relying on type inference for function return values and complex data structures. This improves readability and maintainability.
  - Use inference for simple variables.

- **`any` vs. `unknown`:**
  - Avoid `any`. Prefer `unknown` when a type is not known, as it forces safe type checking.

- **Readonly:**
  - Use `readonly` for properties that should not be changed after initialization to promote immutability.

### Shared Code Architecture

The `shared/` and `shared-angular/` directories are crucial for maintaining a clean separation of concerns.

#### `shared/` Directory

Contains TypeScript code that can be used by both the backend and frontend.

- **`api/`**: Contains API "contracts" defined with `defineApi`. These establish a strongly-typed interface between the client and server.
- **`models/`**: Defines core data entities (`User`, `Product`), service models (`UserView`), and other shared data structures.
- **`localization/`**: Defines the structure and keys for internationalization.
- **`utils/`**: Shared utility functions.

#### `shared-angular/` Directory

Contains shared code that is specific to Angular and shared between multiple frontends.

- **`apis/`**: The auto-generated, type-safe API client services compiled from the definitions in `shared/api/`.
- **`components/`**: Reusable "dumb" components that can be used across different frontends (e.g., `LogoComponent`, `ChartComponent`).
- **`services/`**: Angular services shared across the frontend (e.g., `ThemeService`).

### Backend (@tstdl/base)

#### TypeScript: `type` vs. `class`

- **Rule:** Use `class` for data models/entities (e.g., `User`, `Car`) and for injectable services. Classes are decorated with properties (`@StringProperty`, `@Embedded`, etc.) and decorators (`@Singleton`) to provide essential runtime metadata for the ORM and dependency injection.
- **Rule:** Use `type` for defining API definition shapes (e.g., `UserApiDefinition`), simple data objects, unions, or type aliases.

#### Core Architectural Patterns

- **API Layer:** The API is defined by a contract in `shared/api/` and implemented in `server/source/api/`.
  - The definition specifies endpoints, parameters, and result types.
  - The implementation class is decorated with `@apiController` and implements the `ApiController` interface for type safety.

  ```typescript
  export const userApiDefinition = defineApi({ ... });

  @apiController(userApiDefinition)
  export class UserApi implements ApiController<UserApiDefinition> {
    // ... endpoint implementations
  }
  ```

- **ORM & Repositories:**
  - Data models are defined as classes with ORM decorators (`@Embedded`, `@References`, `@Unique`, etc.).
  - Services that are the primary interface for a data model should extend `getRepository(Model)`.
  - Other services can inject repositories via `injectRepository(Model)`.

  ```typescript
  @Singleton()
  export class UserService extends getRepository(User) { ... }

  @Singleton()
  export class OrderService { // not a repository itself
    readonly #productRepository = injectRepository(Product);
    // ...
  }
  ```

- **Dependency Injection:** Services must be decorated as singletons and dependencies are resolved via `inject()`.

#### Error Handling

- **Rule:** Throw specific, meaningful errors from `@tstdl/base/errors` where appropriate. This provides better context and allows for structured error handling in API responses.

  ```typescript
  import { ForbiddenError } from '@tstdl/base/errors';

  async create({ parameters, getToken }: ...): Promise<...> {
    const token = await getToken<MyAppToken>();

    if (isUndefined(token.payload.tenantId)) {
      throw new ForbiddenError('Tenant required');
    }
    // ...
  }
  ```

#### Helper Functions

- **Rule:** Extract reusable logic into separate, well-named functions. If a helper is only used within a single file, keep it un-exported and co-located at the bottom to reduce the module's public surface area.

### Frontend (Angular)

#### Component Architecture

- **Standalone:** All components, directives, and pipes **must** be `standalone`.
- **Change Detection:** Use `ChangeDetectionStrategy.OnPush` for all components.
- **Inputs & Outputs:**
  - **Rule:** Use the new signal-based `input()`, `output()` and `model()` functions instead of decorators.

  ```typescript
  import { Component, input, booleanAttribute } from '@angular/core';

  @Component(...)
  export class CardComponent {
    readonly interactive = input<boolean, boolean | string>(false, { transform: booleanAttribute });
  }
  ```

#### State Management with Signals

- **State:** Use `signal()` for mutable state, `computed()` for derived values, and `effect()` for side effects.
- **Asynchronous Data:** Use helpers like `resource()` from `@tstdl/angular` to manage state from asynchronous operations like API calls. This cleanly handles loading, error, and value states.

  ```typescript
  import { Component, inject } from '@angular/core';
  import { resource } from '@tstdl/angular';
  import { UserApiService } from '#/shared-angular/apis';

  @Component(...)
  export class UsersPageComponent {
    readonly #userApi = inject(UserApiService);

    readonly users = resource({
      loader: async () => this.#userApi.getAll(),
      defaultValue: []
    });
  }
  ```

#### Styling Strategy (Tailwind CSS & SCSS)

- **Primary Method:** Use Tailwind CSS utility classes directly in component templates.
- **Complex Styles:** For complex, reusable styles, or when targeting pseudo-elements or child components, use component-specific CSS files with Tailwind's `@apply` directive.

#### Routing

- Routes are defined using standalone components and lazy loading via `loadComponent` for pages and `loadChildren` for route groups.

  ```typescript
  import { Routes } from '@angular/router';

  export const appRoutes: Routes = [
    {
      path: 'products',
      loadChildren: () => import('./modules/products/routes').then((m) => m.productRoutes),
    },
    // ...
  ];
  ```

## Version Control

#### Commit Messages

- **Rule:** Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification. This creates a clean, readable history and helps automate changelogs.
- **Format:** `<type>[optional scope]: <description>`
- **Common Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `ci`.
- **Example:** `feat(auth): add JWT authentication`
