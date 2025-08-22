# @tstdl/mail

A robust module for sending emails with powerful templating capabilities and pluggable mail clients.

## Table of Contents

- [Features](#features)
- [Core Concepts](#core-concepts)
- [Usage](#usage)
  - [1. Configuration](#1-configuration)
  - [2. Sending a Simple Email](#2-sending-a-simple-email)
  - [3. Sending a Template-Based Email](#3-sending-a-template-based-email)
  - [4. Using a Specific Client Configuration](#4-using-a-specific-client-configuration)
- [API Summary](#api-summary)

## Features

- **Pluggable Mail Clients**: Abstracted `MailClient` allows for different sending backends. A `NodemailerMailClient` is provided out-of-the-box.
- **Powerful Templating**: Integrates with `@tstdl/templates` to generate email subjects, HTML, and text bodies from templates and context data.
- **Automatic Logging**: Every mail-sending attempt is logged to the database, including data, results, and errors, for auditing and debugging.
- **Flexible Configuration**: Easily configure default clients, connection settings (host, port, auth), and default mail data (e.g., a global `from` address).
- **Database Integration**: Includes schema and migration logic for mail logs.

## Core Concepts

### MailService

The `MailService` is the central component of this module. It provides a high-level API for sending emails. It handles:
- Rendering templates via the `@tstdl/templates` module.
- Interacting with a `MailClient` to perform the actual sending.
- Automatically logging every transaction to the `MailLog` database table.

### MailClient

`MailClient` is an abstract class that defines the contract for a mail-sending implementation. This allows you to swap out the underlying email provider without changing your application code. This module includes `NodemailerMailClient`, a ready-to-use implementation based on the popular Nodemailer library.

### MailTemplate

A `MailTemplate` is a specific type of template used to define the structure of an email. It allows you to specify templates for the `subject`, `html` body, and `text` body of an email. These are then rendered by the `MailService` using context data you provide.

### Configuration and Migration

Before using the module, it must be configured via the `configureMail` function in your application's bootstrap phase. This is where you specify the database connection, the `MailClient` implementation to use (e.g., `NodemailerMailClient`), and default settings. The `migrateMailSchema` function should also be called to set up the necessary `mail.log` table in your database.

## Usage

### 1. Configuration

First, configure the mail module during your application's startup. This example sets up the `NodemailerMailClient` with SMTP settings and a default `from` address.

```typescript
// in your bootstrap.ts
import { configureMail, NodemailerMailClient } from '@tstdl/mail';
import { connect } from '@tstdl/base';

// Bootstrap application...
connect();

configureMail({
  // Use the main application database connection
  database: { connection: 'default' },

  // Specify the client implementation
  client: NodemailerMailClient,

  // Provide default connection settings for the client
  defaultClientConfig: {
    host: 'smtp.example.com',
    port: 587,
    auth: {
      user: 'user@example.com',
      password: 'your-password'
    }
  },

  // Set default mail data, like a global "from" address
  defaultData: {
    from: { name: 'MyApp Support', address: 'support@myapp.com' }
  }
});

// Run database migrations
await migrateMailSchema();
```

### 2. Sending a Simple Email

Inject `MailService` into your class and use the `send()` method.

```typescript
import { Singleton, inject } from '@tstdl/injector';
import { MailService } from '@tstdl/mail';

@Singleton()
export class NotificationService {
  readonly #mailService = inject(MailService);

  async sendPasswordResetNotification(email: string, name: string): Promise<void> {
    await this.#mailService.send({
      to: { name, address: email },
      subject: 'Your Password Reset Request',
      content: {
        text: 'You requested a password reset. Please follow the instructions...',
        html: '<p>You requested a password reset. Please follow the instructions...</p>'
      }
    });
  }
}
```

### 3. Sending a Template-Based Email

For more complex or reusable emails, define a `MailTemplate`.

**a. Define the Template**

```typescript
// in user.mail-templates.ts
import { mailTemplate } from '@tstdl/mail';
import { jsxTemplateField, stringTemplateField } from '@tstdl/templates/resolvers';
import type { User } from './user.model.js';

type WelcomeMailContext = {
  user: User;
  loginUrl: string;
};

export const welcomeMailTemplate = mailTemplate<WelcomeMailContext>('user-welcome', {
  subject: stringTemplateField({
    renderer: 'string',
    template: 'Welcome to our platform, {{ user.firstName }}!'
  }),
  html: jsxTemplateField({
    renderer: 'mjml-jsx', // or 'jsx'
    template: ({ user, loginUrl }) => (
      <div>
        <h1>Hi {user.firstName},</h1>
        <p>Welcome! We are excited to have you on board.</p>
        <a href={loginUrl}>Click here to log in</a>
      </div>
    )
  }),
  text: stringTemplateField({
    renderer: 'string',
    template: 'Hi {{ user.firstName }},\nWelcome! We are excited to have you on board.\nLog in here: {{ loginUrl }}'
  })
});
```

**b. Send the Templated Email**

Use the `sendTemplate()` method to render and send the email.

```typescript
import { Singleton, inject } from '@tstdl/injector';
import { MailService } from '@tstdl/mail';
import { welcomeMailTemplate } from './user.mail-templates.js';
import type { User } from './user.model.js';

@Singleton()
export class UserOnboardingService {
  readonly #mailService = inject(MailService);

  async sendWelcomeEmail(user: User): Promise<void> {
    const context = {
      user,
      loginUrl: 'https://myapp.com/login'
    };

    await this.#mailService.sendTemplate(
      welcomeMailTemplate,
      { to: user.email },
      context
    );
  }
}
```

### 4. Using a Specific Client Configuration

You can override the default client configuration for a single `send` or `sendTemplate` call by passing a `MailClientConfig` object.

```typescript
import { Singleton, inject } from '@tstdl/injector';
import { MailService, type MailClientConfig } from '@tstdl/mail';

@Singleton()
export class TransactionalEmailService {
  readonly #mailService = inject(MailService);

  async sendHighPriorityEmail(email: string): Promise<void> {
    // Use a different SMTP server for high-priority transactional emails
    const highPriorityConfig: MailClientConfig = {
      host: 'smtp.transactional.example.com',
      port: 587,
      auth: {
        user: 'transactional-user',
        password: 'transactional-password'
      }
    };

    await this.#mailService.send(
      {
        to: email,
        subject: 'Important Account Update',
        content: { text: '...' }
      },
      highPriorityConfig
    );
  }
}
```

## API Summary

| Class/Function                 | Description                                                                                                                              |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `MailService`                  | The main service for sending emails.                                                                                                     |
| `MailService.send()`           | `(data: MailData, config?: MailClientConfig) => Promise<MailSendResult>`<br>Sends an email using the provided data and optional config.     |
| `MailService.sendTemplate()`   | `(template: MailTemplate, data: MailData, context: object, config?: MailClientConfig) => Promise<MailSendResult>`<br>Sends a templated email. |
| `MailClient`                   | Abstract class for mail client implementations.                                                                                          |
| `NodemailerMailClient`         | An implementation of `MailClient` using Nodemailer.                                                                                      |
| `configureMail()`              | `(config: MailModuleConfig) => void`<br>Configures the mail module during application startup.                                            |
| `migrateMailSchema()`          | `() => Promise<void>`<br>Runs database migrations for the mail module.                                                                    |
| `mailTemplate()`               | `(name: string, fields: MailTemplateFields) => MailTemplate`<br>A helper function to create a type-safe `MailTemplate` definition.         |