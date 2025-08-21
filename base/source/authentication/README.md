# @tstdl/base/authentication

A comprehensive, JWT-based authentication module for managing user sessions, credentials, and tokens on both client and server sides.

## Table of Contents

- [Features](#features)
- [Core Concepts](#core-concepts)
  - [Server-Side: `AuthenticationService`](#server-side-authenticationservice)
  - [Client-Side: `AuthenticationClientService`](#client-side-authenticationclientservice)
  - [Extensibility: `AuthenticationAncillaryService`](#extensibility-authenticationancillaryservice)
  - [Custom Secret Validation: `AuthenticationSecretRequirementsValidator`](#custom-secret-validation-authenticationsecretrequirementsvalidator)
  - [API Definition](#api-definition)
- [Usage](#usage)
  - [Server-Side Setup](#server-side-setup)
  - [Client-Side Setup](#client-side-setup)
- [API Summary](#api-summary)
  - [Configuration Functions](#configuration-functions)
  - [Core Services (Server-Side)](#core-services-server-side)
  - [Core Services (Client-Side)](#core-services-client-side)
  - [Extensibility (Server-Side)](#extensibility-server-side)
  - [HTTP Middleware (Client-Side)](#http-middleware-client-side)

## Features

- **JWT-based Authentication**: Secure user sessions using JSON Web Tokens with access and refresh token rotation.
- **Secure Credential Handling**: Uses PBKDF2 for hashing and salting user secrets, with built-in protection against timing attacks.
- **Client-Side Service**: A dedicated `AuthenticationClientService` for browsers that manages token lifecycle, state (via signals/observables), and user actions like login and logout.
- **Server-Side Service**: A robust `AuthenticationService` for the backend to validate credentials, issue tokens, and manage sessions in the database.
- **Impersonation**: Allows authorized users (e.g., administrators) to log in as other users for support or testing purposes.
- **Secret Reset Flow**: Provides a secure mechanism for users to reset their secrets.
- **Pluggable Secret Validation**: Use the default validator or implement `AuthenticationSecretRequirementsValidator` to enforce custom secret policies (e.g., strength, exposure in data breaches).
- **Extensible Architecture**: The `AuthenticationAncillaryService` provides hooks to integrate custom logic, such as resolving user identifiers, adding custom data to token payloads, and defining impersonation rules.
- **Type-Safe API**: Leverages a shared API definition to ensure type safety between the client and server.
- **Database Support**: Includes database models (`AuthenticationCredentials`, `AuthenticationSession`) and automatic schema migration capabilities.
- **HTTP Middleware**: Provides a middleware for `HttpClient` to automatically wait for a valid token before sending requests to protected endpoints.

## Core Concepts

The module is split into client-side and server-side components that work together to provide a full authentication solution.

### Server-Side: `AuthenticationService`

This is the heart of the backend authentication logic. Its main responsibilities are:

- **Credential Management**: Securely storing and verifying user credentials (`subject` and `secret`) using the `AuthenticationCredentials` database entity.
- **Session Management**: Creating and managing user sessions in the database via the `AuthenticationSession` entity. Each login creates a new session.
- **Token Issuance**: Generating signed JWTs (access tokens) and refresh tokens upon successful authentication.
- **Token Validation**: Validating tokens from incoming requests to authenticate users.
- **Business Logic**: Handling impersonation, secret resets, and session termination.

### Client-Side: `AuthenticationClientService`

This service is designed for use in a browser environment. It simplifies all client-side authentication tasks:

- **Token Storage**: Persists tokens in `localStorage` to maintain sessions across page reloads.
- **State Management**: Exposes the authentication state (e.g., `isLoggedIn`, `token`, `subject`) as signals and RxJS Observables, making it easy to build reactive UIs.
- **Automatic Refresh**: Automatically refreshes the access token before it expires using the refresh token, ensuring a seamless user experience.
- **API Interaction**: Provides simple methods (`login()`, `logout()`, `impersonate()`, etc.) that communicate with the server-side API.

### Extensibility: `AuthenticationAncillaryService`

This abstract class is the primary extension point for integrating the module into your application. You **must** provide an implementation of this service to tailor the authentication process to your specific needs.

- `resolveSubject(providedSubject)`: Maps a user-provided identifier (like an email or username) to the unique, internal subject ID used by the system.
- `getTokenPayload(subject, authData, context)`: Adds custom data to the JWT payload, such as user roles, permissions, or other metadata.
- `canImpersonate(token, subject, authData)`: Defines the rules for which users are allowed to impersonate others.
- `handleInitSecretReset(data)`: Hooks into the secret reset process, typically to send an email or notification to the user with a reset link.

### Custom Secret Validation: `AuthenticationSecretRequirementsValidator`

This abstract class allows you to define custom rules for validating user secrets (passwords). The default implementation checks for minimum strength and whether the secret has been exposed in known data breaches. You can provide your own implementation to enforce different policies.

### API Definition

The module uses a shared, type-safe API definition (`authenticationApiDefinition`) for all client-server communication. This ensures that requests and responses are correctly typed on both ends, reducing runtime errors and improving developer experience. Both the server-side `AuthenticationApiController` and the client-side `AuthenticationApiClient` are generated from this definition.

## Usage

### Server-Side Setup

1.  **Implement the `AuthenticationAncillaryService`**

    Create a class that extends `AuthenticationAncillaryService` to connect the module to your application's user model and business logic.

    ```typescript
    import { AuthenticationAncillaryService, GetTokenPayloadContext, ResolveSubjectResult } from '@tstdl/base/authentication/server';
    import { InitSecretResetData, TokenPayload } from '@tstdl/base/authentication';
    import { Singleton, inject } from '@tstdl/base/injector';
    import { MailService } from '@tstdl/base/mail';
    import { UserService, User } from './user.service.ts'; // Your user service and model

    // Define the custom data you want in your JWT payload
    type MyTokenPayload = {
      permissions: string[];
      isSuperUser: boolean;
    };

    // Define any extra data needed for authentication
    type MyAuthData = {
      tenantId?: string;
    };

    @Singleton()
    class MyAncillaryService extends AuthenticationAncillaryService<MyTokenPayload, MyAuthData> {
      readonly #userService = inject(UserService);
      readonly #mailService = inject(MailService);

      async resolveSubject(email: string): Promise<ResolveSubjectResult> {
        const user = await this.#userService.tryLoadByQuery({ mail: email.toLowerCase() });
        return user ? { success: true, subject: user.id } : { success: false };
      }

      async getTokenPayload(subject: string, authData: MyAuthData): Promise<MyTokenPayload> {
        const user = await this.#userService.load(subject);
        // You can use authData to scope permissions, e.g., to a specific tenant
        const permissions = user.getPermissionsForTenant(authData.tenantId);
        return { permissions, isSuperUser: user.isSuperUser };
      }

      async canImpersonate(impersonatorToken: TokenPayload<MyTokenPayload>, subjectToImpersonate: string): Promise<boolean> {
        // Only allow super users to impersonate
        return impersonatorToken.isSuperUser;
      }

      async handleInitSecretReset(data: InitSecretResetData): Promise<void> {
        const user = await this.#userService.load(data.subject);
        const resetUrl = `https://myapp.com/reset-password?token=${data.token}`;

        // Example: Send an email with the reset link
        await this.#mailService.send({
          to: user.mail,
          subject: 'Reset your password',
          html: `Click here to reset your password: <a href="${resetUrl}">${resetUrl}</a>`,
        });
      }
    }
    ```

2.  **Configure the Module**

    In your application's bootstrap file, configure the authentication module and run its migrations.

    ```typescript
    import { configureAuthenticationServer, migrateAuthenticationSchema } from '@tstdl/base/authentication/server';
    import { MyAncillaryService } from './my-ancillary.service.ts';

    // Configure the server
    configureAuthenticationServer({
      serviceOptions: {
        // Use environment variables or a secrets manager in production!
        secret: 'a-very-strong-and-long-secret-key-for-signing-tokens',
      },
      authenticationAncillaryService: MyAncillaryService,
    });

    // Run database migrations on startup
    await migrateAuthenticationSchema();
    ```

3.  **Register the API Controller**

    The module's `AuthenticationApiController` is automatically registered via the `@apiController` decorator. Ensure your API server setup discovers and uses it.

### Client-Side Setup

1.  **Configure the Client Module**

    In your client application's setup file, configure the authentication client.

    ```typescript
    import { configureAuthenticationClient } from '@tstdl/base/authentication';

    configureAuthenticationClient({
      // Registers a middleware for HttpClient that automatically
      // waits for a valid token before sending requests to protected endpoints.
      registerMiddleware: true,
    });
    ```

2.  **Use the `AuthenticationClientService`**

    Inject and use the service in your components or other services to manage authentication state and perform actions.

    ```typescript
    import { AuthenticationClientService } from '@tstdl/base/authentication';
    import { inject } from '@tstdl/base/injector';
    import { computed } from '@tstdl/base/signals';

    class LoginComponent {
      readonly #authService = inject(AuthenticationClientService);

      // Signals for reactive UI
      readonly isLoggedIn = this.#authService.isLoggedIn;
      readonly subject = this.#authService.subject;
      readonly welcomeMessage = computed(() => `Welcome, ${this.subject() ?? 'Guest'}`);

      async login(email: string, secret: string) {
        try {
          await this.#authService.login(email, secret, { tenantId: 'some-tenant' });
          console.log('Login successful!');
        } catch (error) {
          console.error('Login failed:', error);
        }
      }

      async logout() {
        await this.#authService.logout();
        console.log('Logged out.');
      }
    }
    ```

## API Summary

### Configuration Functions

| Function | Description |
| :--- | :--- |
| `configureAuthenticationServer(config)` | Configures the server-side authentication module. Requires `serviceOptions` and `authenticationAncillaryService`. |
| `configureAuthenticationClient(config)` | Configures the client-side authentication module. Can register HTTP middleware. |
| `migrateAuthenticationSchema()` | Applies database migrations for the authentication schema. |

### Core Services (Server-Side)

#### `AuthenticationService`

The main service for handling authentication logic on the server.

| Method | Arguments | Returns | Description |
| :--- | :--- | :--- | :--- |
| `setCredentials` | `subject: string`, `secret: string`, `options?: SetCredentialsOptions` | `Promise<void>` | Sets or updates credentials for a subject. |
| `authenticate` | `subject: string`, `secret: string` | `Promise<AuthenticationResult>` | Verifies a subject's credentials. |
| `getToken` | `subject: string`, `authenticationData: AuthData`, `options?: { impersonator?: string }` | `Promise<TokenResult>` | Creates a new session and returns tokens. |
| `login` | `subject: string`, `secret: string`, `data: AuthData` | `Promise<TokenResult>` | Authenticates and returns tokens for a new session. |
| `refresh` | `refreshToken: string`, `authenticationData: AuthData`, `options?: { ... }` | `Promise<TokenResult>` | Refreshes an access token using a valid refresh token. |
| `impersonate` | `impersonatorToken: string`, `impersonatorRefreshToken: string`, `subject: string`, `authenticationData: AuthData` | `Promise<TokenResult>` | Initiates an impersonation session. |
| `unimpersonate` | `impersonatorRefreshToken: string`, `authenticationData: AuthData` | `Promise<TokenResult>` | Ends an impersonation session. |
| `endSession` | `sessionId: string` | `Promise<void>` | Invalidates a user session. |
| `validateToken` | `token: string` | `Promise<Token>` | Validates a JWT access token. |

### Core Services (Client-Side)

#### `AuthenticationClientService`

The main service for managing authentication on the client.

| Member | Type | Description |
| :--- | :--- | :--- |
| `token` | `Signal<TokenPayload \| undefined>` | The current authentication token payload. |
| `isLoggedIn` | `Signal<boolean>` | A computed signal that is `true` if the user is logged in. |
| `subject` | `Signal<string \| undefined>` | The subject (ID) of the currently logged-in user. |
| `impersonator` | `Signal<string \| undefined>` | The subject of the impersonator, if any. |
| `login` | `(subject: string, secret: string, data?: AuthData) => Promise<void>` | Authenticates the user and stores the tokens. |
| `logout` | `() => Promise<void>` | Logs the user out and clears tokens. |
| `refresh` | `(data?: AuthData) => Promise<void>` | Manually refreshes the authentication token. |
| `impersonate` | `(subject: string, data?: AuthData) => Promise<void>` | Starts an impersonation session. |
| `unimpersonate` | `(data?: AuthData) => Promise<void>` | Ends an impersonation session. |
| `checkSecret` | `(secret: string) => Promise<SecretCheckResult>` | Checks a secret against server-side requirements. |

### Extensibility (Server-Side)

#### `AuthenticationAncillaryService` (Abstract Class)

Implement this service to integrate your application's logic.

| Abstract Method | Arguments | Returns | Description |
| :--- | :--- | :--- | :--- |
| `resolveSubject` | `providedSubject: string` | `Promise<ResolveSubjectResult>` | Maps a login identifier (e.g., email) to a user ID. |
| `getTokenPayload` | `subject: string`, `authenticationData: AuthData`, `context: GetTokenPayloadContext` | `Promise<AdditionalTokenPayload>` | Adds custom data to the JWT payload. |
| `handleInitSecretReset` | `data: InitSecretResetData & Additional...` | `Promise<void>` | Handles the logic for a secret reset (e.g., sending an email). |
| `canImpersonate` | `token: TokenPayload`, `subject: string`, `authenticationData: AuthData` | `Promise<boolean>` | Determines if a user can impersonate another. |

#### `AuthenticationSecretRequirementsValidator` (Abstract Class)

Implement this service to define custom secret validation rules.

| Abstract Method | Arguments | Returns | Description |
| :--- | :--- | :--- | :--- |
| `checkSecretRequirements` | `secret: string` | `Promise<SecretCheckResult>` | Checks a secret and returns a detailed result object. |
| `testSecretRequirements` | `secret: string` | `Promise<SecretTestResult>` | Tests a secret and returns a simple success/fail result with a reason. |
| `validateSecretRequirements` | `secret: string` | `Promise<void>` | Validates a secret, throwing a `SecretRequirementsError` on failure. |

### HTTP Middleware (Client-Side)

| Function | Description |
| :--- | :--- |
| `waitForAuthenticationCredentialsMiddleware(authService)` | An `HttpClientMiddleware` that pauses outgoing requests until a valid authentication token is available. |
