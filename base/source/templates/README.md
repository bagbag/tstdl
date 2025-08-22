# @tstdl/templates

A powerful and extensible templating engine for TypeScript applications.

This module provides a robust system for defining, resolving, and rendering templates from various sources and in multiple formats, including strings, JSX, Handlebars, and MJML for responsive emails.

## Table of Contents

- [Features](#features)
- [Core Concepts](#core-concepts)
  - [Rendering Flow](#rendering-flow)
- [Usage](#usage)
  - [1. Setup](#1-setup)
  - [2. Simple In-Memory String Template](#2-simple-in-memory-string-template)
  - [3. File-based Handlebars Template](#3-file-based-handlebars-template)
  - [4. JSX/MJML Email Template](#4-jsxmjml-email-template)
- [API Summary](#api-summary)

## Features

- **Extensible Architecture:** Easily add custom template sources (Providers), content resolvers (Resolvers), and templating engines (Renderers).
- **Multiple Formats:** Built-in support for simple strings, JSX components, Handlebars, and MJML.
- **Flexible Template Sources:** Load templates programmatically from memory (`MemoryTemplateProvider`) or from the file system (`FileTemplateProvider`).
- **Type-Safe by Design:** Leverages TypeScript for creating well-defined, type-safe templates and contexts.
- **Dependency Injection:** Seamlessly integrates with the `@tstdl/injector` for configuration and extensibility.

## Core Concepts

The module is built around a few key components that work together to provide its flexibility.

- **`TemplateService`**: The main entry point for rendering templates. It orchestrates the other components to produce the final output.
- **`Template`**: A model that defines a template. It consists of a `name` and a collection of `fields` (e.g., `subject`, `body`). Each field specifies how its content should be retrieved and processed.
- **`TemplateProvider`**: Responsible for *loading* `Template` definitions. For example, `MemoryTemplateProvider` holds templates defined in code, while `FileTemplateProvider` loads them from `.ts` or `.js` files.
- **`TemplateResolver`**: Resolves a template field into its raw, un-rendered content. For example, `FileTemplateResolver` reads a file's content from a path specified in a field, while `StringTemplateResolver` simply returns a string or executes a function defined in a field.
- **`TemplateRenderer`**: Takes the raw content from a resolver and renders it using a specific engine and a data context. Examples include `StringTemplateRenderer`, `JsxTemplateRenderer`, `HandlebarsTemplateRenderer`, and `MjmlTemplateRenderer`.

### Rendering Flow

When you call `templateService.render('my-template', { user: ... })`:

1.  The `TemplateProvider` is used to load the `Template` definition for `'my-template'`.
2.  For each `field` within the template:
    a. The `TemplateResolverProvider` finds the appropriate `TemplateResolver` based on the field's `resolver` property (e.g., `'file'`).
    b. The `TemplateResolver` processes the field to get the raw template content (e.g., reads a `.hbs` file from disk).
    c. The `TemplateRendererProvider` finds the appropriate `TemplateRenderer` based on the field's `renderer` property (e.g., `'handlebars'`).
    d. The `TemplateRenderer` takes the raw content and the context data (e.g., `{ user: ... }`) to produce the final rendered string.
3.  The service returns an object containing the rendered content for each field.

## Usage

### 1. Setup

First, configure the module in your application's bootstrap file. You need to register at least one provider, resolver, and renderer.

```typescript
import { configureTemplates } from '@tstdl/templates';
import { MemoryTemplateProvider } from '@tstdl/templates/providers';
import { StringTemplateRenderer } from '@tstdl/templates/renderers';
import { StringTemplateResolver } from '@tstdl/templates/resolvers';

// In your application's bootstrap file
configureTemplates({
  templateProvider: MemoryTemplateProvider,
  templateResolvers: [StringTemplateResolver],
  templateRenderers: [StringTemplateRenderer],
});
```

### 2. Simple In-Memory String Template

This example defines a template programmatically, stores it in memory, and renders it using a simple string function.

```typescript
import { inject } from '@tstdl/injector';
import { TemplateService, simpleTemplate } from '@tstdl/templates';
import { MemoryTemplateProvider } from '@tstdl/templates/providers';
import { stringTemplateField } from '@tstdl/templates/resolvers';

// 1. Define the template and its data context
type WelcomeTemplateContext = { user: { name: string } };

const welcomeTemplate = simpleTemplate<WelcomeTemplateContext>(
  'welcome-message',
  stringTemplateField({
    renderer: 'string',
    template: (context) => `Hello, ${context.user.name}!`
  })
);

// 2. Add the template to the provider
const memoryProvider = inject(MemoryTemplateProvider);
memoryProvider.add(welcomeTemplate.name, welcomeTemplate);

// 3. Render it using the service
const templateService = inject(TemplateService);
const result = await templateService.render(welcomeTemplate, { user: { name: 'Alice' } });

console.log(result.fields.template); // Output: "Hello, Alice!"
```

### 3. File-based Handlebars Template

This example demonstrates loading a template definition and its content from the file system and rendering it with Handlebars.

**a. Configuration**

```typescript
import { configureTemplates } from '@tstdl/templates';
import { configureFileTemplateProvider, FileTemplateProvider } from '@tstdl/templates/providers';
import { HandlebarsTemplateRenderer } from '@tstdl/templates/renderers';
import { configureFileTemplateResolver, FileTemplateResolver } from '@tstdl/templates/resolvers';

// Configure base paths for loading template definitions and their content files
configureFileTemplateProvider({ basePath: './src/templates/definitions' });
configureFileTemplateResolver({ basePath: './src/templates/content' });

configureTemplates({
  templateProvider: FileTemplateProvider,
  templateResolvers: [FileTemplateResolver],
  templateRenderers: [HandlebarsTemplateRenderer],
});
```

**b. Template Definition (`./src/templates/definitions/product-alert.ts`)**

```typescript
import { Template } from '@tstdl/templates';
import { fileTemplateField } from '@tstdl/templates/resolvers';

export type ProductAlertContext = { product: { name: string }, user: { name: string } };

const template: Template<{ subject: true, body: true }, any, ProductAlertContext> = {
  name: 'product-alert',
  fields: {
    subject: fileTemplateField({
      renderer: 'handlebars',
      templateFile: 'product-alert/subject.hbs'
    }),
    body: fileTemplateField({
      renderer: 'handlebars',
      templateFile: 'product-alert/body.hbs'
    })
  }
};

export default template;
```

**c. Template Content**

- `./src/templates/content/product-alert/subject.hbs`:
  ```handlebars
  {{product.name}} is back in stock!
  ```
- `./src/templates/content/product-alert/body.hbs`:
  ```handlebars
  Hi {{user.name}}, the product {{product.name}} you were interested in is now available.
  ```

**d. Rendering**

```typescript
import { inject } from '@tstdl/injector';
import { TemplateService } from '@tstdl/templates';

const templateService = inject(TemplateService);
const result = await templateService.render('product-alert', {
  user: { name: 'Bob' },
  product: { name: 'Super Widget' }
});

console.log(result.fields.subject); // "Super Widget is back in stock!"
console.log(result.fields.body);    // "Hi Bob, the product Super Widget you were interested in is now available."
```

### 4. JSX/MJML Email Template

Create responsive HTML emails using JSX and MJML. The `MjmlTemplateRenderer` can use another renderer, like JSX, as a preprocessor.

**a. Configuration**

```typescript
import { configureTemplates } from '@tstdl/templates';
import { MemoryTemplateProvider } from '@tstdl/templates/providers';
import { JsxTemplateRenderer, MjmlTemplateRenderer } from '@tstdl/templates/renderers';
import { JsxTemplateResolver } from '@tstdl/templates/resolvers';

configureTemplates({
  templateProvider: MemoryTemplateProvider,
  templateResolvers: [JsxTemplateResolver],
  templateRenderers: [JsxTemplateRenderer, MjmlTemplateRenderer],
});
```

**b. Template Definition and Rendering**

```typescript
import { inject } from '@tstdl/injector';
import { TemplateService } from '@tstdl/templates';
import { MemoryTemplateProvider } from '@tstdl/templates/providers';
import { simpleJsxTemplate } from '@tstdl/templates/resolvers';

// 1. Define the data context and the JSX component
type OrderConfirmationContext = { order: { id: string } };

const OrderConfirmationEmail = ({ order }: OrderConfirmationContext) => (
  <mjml>
    <mj-body>
      <mj-section>
        <mj-column>
          <mj-text>Your order #{order.id} has been confirmed!</mj-text>
        </mj-column>
      </mj-section>
    </mj-body>
  </mjml>
);

// 2. Create a simple template definition using the JSX component
const emailTemplate = simpleJsxTemplate<OrderConfirmationContext>(
  'order-confirmation-email',
  OrderConfirmationEmail
);

// 3. Set the renderer to 'mjml-jsx' to preprocess JSX before rendering MJML
emailTemplate.fields.template.renderer = 'mjml-jsx';

// 4. Add to provider and render
const memoryProvider = inject(MemoryTemplateProvider);
memoryProvider.add(emailTemplate.name, emailTemplate);

const templateService = inject(TemplateService);
const result = await templateService.render('order-confirmation-email', { order: { id: '123-ABC' } });

// result.fields.template now contains responsive HTML
console.log(result.fields.template);
```

## API Summary

| Class/Function | Arguments | Return Type | Description |
| :--- | :--- | :--- | :--- |
| `configureTemplates(config)` | `config: Partial<TemplateModuleConfig>` | `void` | Configures the template module with providers, resolvers, and renderers. |
| `TemplateService` | | | The main service for rendering templates. |
| `  .render(keyOrTemplate, context)` | `keyOrTemplate: string \| Template`, `context?: Record` | `Promise<TemplateServiceRenderResult>` | Renders a template by key or definition with the given context. |
| `  .get(key)` | `key: string` | `Promise<Template>` | Retrieves a template definition by its key. |
| `TemplateProvider` (abstract) | | | Base class for template providers. |
| `  .get(key)` | `key: string` | `Promise<Template>` | Loads a template definition. |
| `MemoryTemplateProvider` | | | A provider that stores templates in memory. |
| `  .add(key, template)` | `key: string`, `template: Template` | `void` | Adds a template to the provider. |
| `FileTemplateProvider` | | | A provider that loads template definitions from JavaScript/TypeScript files. |
| `TemplateResolver` (abstract) | | | Base class for template resolvers. |
| `  .resolve(field)` | `field: TemplateField` | `Promise<unknown>` | Resolves a template field to its raw content. |
| `FileTemplateResolver` | | | Resolves a `templateFile` path into the file's string content. |
| `JsxTemplateResolver` | | | Resolves a `template` property containing a JSX component. |
| `StringTemplateResolver` | | | Resolves a `template` property containing a string or a function returning a string. |
| `TemplateRenderer` (abstract) | | | Base class for template renderers. |
| `  .render(renderObject, context)` | `renderObject: TemplateRenderObject`, `context?: Record` | `Promise<string>` | Renders the raw template content with a context. |
| `HandlebarsTemplateRenderer`| | | Renders templates using Handlebars.js. |
| `JsxTemplateRenderer` | | | Renders JSX templates to an HTML string. |
| `MjmlTemplateRenderer` | | | Renders MJML to responsive HTML. Can use another renderer (e.g., JSX) as a preprocessor. |
| `StringTemplateRenderer` | | | Renders string templates by simple replacement or function execution. |