# Browser Automation Module

A high-level, controller-based wrapper for Playwright, designed to simplify web automation, scraping, and testing tasks within a dependency-injection-friendly architecture.

## Table of Contents

- [Features](#features)
- [Core Concepts](#core-concepts)
  - [Controller Hierarchy](#controller-hierarchy)
- [Usage](#usage)
  - [Configuration](#configuration)
  - [Basic Automation](#basic-automation)
  - [DI-Powered Lifecycle Management](#di-powered-lifecycle-management)
  - [Working with Persistent Contexts](#working-with-persistent-contexts)
  - [Locating and Filtering Elements](#locating-and-filtering-elements)
  - [Attaching a Logger](#attaching-a-logger)
  - [Rendering a PDF](#rendering-a-pdf)
- [API Summary](#api-summary)
  - [Configuration](#configuration-1)
  - [BrowserService](#browserservice)
  - [BrowserController](#browsercontroller)
  - [BrowserContextController](#browsercontextcontroller)
  - [PageController & FrameController](#pagecontroller--framecontroller)
  - [ElementController](#elementcontroller)

## Features

- **Hierarchical Controllers:** Manage `Browser`, `BrowserContext`, `Page`, `Frame`, and `Element` through a clean, object-oriented API.
- **Dependency Injection:** Designed to be resolved and managed by a DI container, simplifying lifecycle and dependency management.
- **Unified Element API:** `ElementController` provides a consistent and powerful interface over Playwright's `Locator` and `ElementHandle`.
- **Simplified Configuration:** Set global defaults for browser launch and context creation to reduce boilerplate.
- **Convenience Methods:** Includes helpers for common tasks like PDF generation, advanced scrolling, and automatic logger attachment.
- **Robust & Asynchronous:** Built with modern TypeScript, leveraging `async`/`await` and `AsyncDisposable` for reliable resource management.

## Core Concepts

The module is built around a hierarchy of controllers, each encapsulating a part of the browser automation lifecycle. This design promotes clean, organized, and maintainable code.

- **`BrowserService`**: The main entry point. This singleton service is responsible for creating and managing all browser instances. Use it to launch new `BrowserController` instances or persistent contexts.
- **`BrowserController`**: Represents a single browser instance (e.g., Chromium, Firefox). It's the factory for creating isolated browser sessions (`BrowserContextController`). It can be resolved via DI to get a managed browser instance.
- **`BrowserContextController`**: Represents an isolated browser session with its own cookies, cache, and storage. It is used to create new pages (`PageController`). It can also be resolved via DI for a managed context.
- **`PageController` / `FrameController`**: These controllers represent a single browser tab or an `<iframe>`, respectively. They are the primary entry points for interacting with a web page, including navigation, content evaluation, and element location. They inherit from `DocumentController`.
- **`DocumentController`**: A base class for `PageController` and `FrameController` that provides shared functionality for interacting with a document, like finding frames and waiting for elements. It inherits from `LocatorController`.
- **`LocatorController`**: A base class providing the powerful `getBy...` methods (e.g., `getByRole`, `getByText`) for finding elements on a page or within a frame/element.
- **`ElementController`**: Wraps a Playwright `Locator` or `ElementHandle`. This is the workhorse for all element-level interactions like clicking, typing, and fetching attributes. It provides a rich set of methods for chaining, filtering, and asserting element states.

### Controller Hierarchy

The typical flow of control and inheritance is:

`BrowserService` → `BrowserController` → `BrowserContextController` → `PageController` / `FrameController` (extends `DocumentController` which extends `LocatorController`) → `ElementController`

## Usage

### Configuration

Before using the service, you can optionally configure default options for all new browser instances. This is useful for setting global settings like headless mode or browser type.

```typescript
import { configureBrowser } from '@tstdl/base/browser';

// This should be done once at application startup
configureBrowser({
  options: {
    defaultNewBrowserOptions: {
      headless: 'new', // Use the new headless mode
      browser: 'chromium',
      windowSize: { width: 1920, height: 1080 },
      defaultNewContextOptions: {
        locale: 'en-US',
        colorScheme: 'dark',
      },
    },
  },
});
```

### Basic Automation

The following example demonstrates a complete workflow: launching a browser, navigating to a page, interacting with elements, and cleaning up resources.

```typescript
import { BrowserService, type BrowserController } from '@tstdl/base/browser';
import { disposeAsync } from '@tstdl/base/disposable';
import { Injector } from '@tstdl/base/injector';

// Assume DI container is configured
const browserService = Injector.resolve(BrowserService);

// Launch a new browser instance
const browser: BrowserController = await browserService.newBrowser();

try {
  // Create a new context and page
  const context = await browser.newContext();
  const page = await context.newPage();

  // Navigate to a website
  await page.navigate('https://playwright.dev/');

  // Use locators to find elements
  const docsLink = page.getByRole('link', { name: 'Docs' });
  await docsLink.click();

  // Wait for the new URL
  await page.waitForUrl('**/docs/intro');
  console.log('Navigated to docs page:', page.url());

  // Find an element and get its text
  const title = page.getByText('Why Playwright?');
  if (await title.isVisible()) {
    console.log('Found title element.');
  }

  // Interact with a form element
  const searchInput = page.getByLabel('Search');
  await searchInput.fill('locators');
  await searchInput.press('Enter');
} finally {
  // Clean up the browser instance and all its contexts/pages
  await browser[Symbol.asyncDispose]();
}
```

### DI-Powered Lifecycle Management

`BrowserController` and `BrowserContextController` are injectable, allowing the DI container to manage their lifecycle automatically.

```typescript
import { BrowserContextController } from '@tstdl/base/browser';
import { Inject, Injectable } from '@tstdl/base/injector';

@Injectable()
class MyScraper {
  // A new browser context is created and injected automatically.
  // When MyScraper is disposed, the context will be disposed too.
  constructor(@Inject() private readonly context: BrowserContextController) {}

  async scrapeData() {
    const page = await this.context.newPage();
    await page.navigate('https://example.com');
    const header = await page.getByRole('heading').inputValue();
    await page.close();
    return header;
  }
}
```

### Working with Persistent Contexts

Use a persistent context to save and reuse session data like cookies and `localStorage` between runs.

```typescript
import { BrowserService } from '@tstdl/base/browser';
import { Injector } from '@tstdl/base/injector';

const browserService = Injector.resolve(BrowserService);

// The first run will create the data directory and might require a login.
const context = await browserService.newPersistentContext('./user-data-dir');
const page = await context.newPage();

// ... perform login actions ...

await context.close();

// The second run reuses the session.
const context2 = await browserService.newPersistentContext('./user-data-dir');
// ... continue scraping as a logged-in user ...
await context2.close();
```

### Locating and Filtering Elements

`ElementController` provides a rich API for locating and filtering elements.

```typescript
import type { PageController } from '@tstdl/base/browser';

async function findSpecificElement(page: PageController) {
  // Locate a list of items
  const list = page.getByRole('list', { name: 'Product List' });

  // Locate an item within the list that has specific text and a button
  const specificItem = list
    .locate('li') // find all list items
    .filter({ hasText: 'Special Offer' }) // filter for items with this text
    .filter({ has: page.getByRole('button', { name: 'Buy Now' }) }) // further filter for items containing a "Buy Now" button
    .first(); // get the first matching item

  if (await specificItem.exists()) {
    console.log('Found the specific item!');
    await specificItem.click();
  }
}
```

### Attaching a Logger

You can attach a logger to a `BrowserContextController` or `PageController` to automatically log console messages and network requests, which is invaluable for debugging.

```typescript
import type { BrowserContextController } from '@tstdl/base/browser';
import { Logger } from '@tstdl/base/logger';

async function attach(logger: Logger, context: BrowserContextController) {
  context.attachLogger(logger);

  const page = await context.newPage();
  // All console logs and requests from this page will now be logged.
  await page.navigate('https://example.com');
}
```

### Rendering a PDF

You can easily render a page as a PDF with various customization options.

```typescript
import { writeFile } from 'node:fs/promises';
import type { PageController } from '@tstdl/base/browser';

async function savePageAsPdf(page: PageController) {
  await page.navigate('https://example.com');

  const pdfBuffer = await page.renderPdf({
    format: 'A4',
    landscape: false,
    renderBackground: true,
    margin: { top: '20px', bottom: '20px' },
  });

  await writeFile('example.pdf', pdfBuffer);
  console.log('PDF saved successfully.');
}
```

## API Summary

This is a brief overview of the main classes and their key methods.

### Configuration

| Function | Arguments | Returns | Description |
| :--- | :--- | :--- | :--- |
| `configureBrowser()` | `options: BrowserModuleOptions` | `void` | Sets up global default options for the `BrowserService`. |

### `BrowserService`

A singleton service for managing browser instances.

| Method | Arguments | Returns | Description |
| :--- | :--- | :--- | :--- |
| `newBrowser()` | `options?: NewBrowserOptions` | `Promise<BrowserController>` | Launches a new browser instance. |
| `newPersistentContext()` | `dataDirectory: string, browserOptions?: NewBrowserOptions, contextOptions?: NewBrowserContextOptions` | `Promise<BrowserContextController>` | Launches a browser with a persistent context for saving session data. |
| `dispose()` | | `Promise<void>` | Closes all browsers and contexts created by this service. |

### `BrowserController`

Controls a single browser instance.

| Method | Arguments | Returns | Description |
| :--- | :--- | :--- | :--- |
| `newContext()` | `options?: NewBrowserContextOptions` | `Promise<BrowserContextController>` | Creates a new, isolated browser context. |
| `close()` | | `Promise<void>` | Closes the browser and all its contexts. |

### `BrowserContextController`

Controls an isolated browser session.

| Method | Arguments | Returns | Description |
| :--- | :--- | :--- | :--- |
| `newPage()` | `options?: NewPageOptions` | `Promise<PageController>` | Creates a new page (tab) within the context. |
| `getState()` | | `Promise<BrowserContextState>` | Gets the storage state (cookies, localStorage). |
| `pages()` | | `PageController[]` | Returns a list of all pages in the context. |
| `attachLogger()` | `logger: Logger` | `void` | Attaches a logger to log console messages and requests. |
| `close()` | | `Promise<void>` | Closes the browser context and all its pages. |

### `PageController` & `FrameController`

Controls a single page (tab) or an `<iframe>`. They inherit locator methods like `getByRole()` from `LocatorController`.

| Method | Arguments | Returns | Description |
| :--- | :--- | :--- | :--- |
| `navigate()` | `url: string, options?: ...` | `Promise<void>` | Navigates the page/frame to a URL. |
| `waitForUrl()` | `url: string \| RegExp \| ((url: URL) => boolean), options?: ...` | `Promise<void>` | Waits for the URL to match the provided predicate. |
| `waitForElement()` | `selector: string, options?: ...` | `Promise<ElementController>` | Waits for an element to appear in the DOM. |
| `renderPdf()` | `options?: PdfRenderOptions` | `Promise<Uint8Array>` | **(PageController only)** Renders the current page as a PDF. |
| `scrollTo()` | `coordinates: ScrollToCoordinates \| ElementController` | `Promise<void>` | **(PageController only)** Intelligently scrolls the page to a specific coordinate or element. |
| `close()` | | `Promise<void>` | **(PageController only)** Closes the page. |
| `frames()` | | `FrameController[]` | Returns all frames within the document. |
| `getPage()` | `options?: PageControllerOptions` | `PageController` | **(FrameController only)** Gets the page containing the frame. |

### `ElementController`

The primary tool for interacting with DOM elements. Provides all locator methods from Playwright (e.g., `getByRole`, `getByText`).

| Method | Arguments | Returns | Description |
| :--- | :--- | :--- | :--- |
| `click()` | `options?: ...` | `Promise<void>` | Clicks the element. |
| `fill()` | `text: string, options?: ...` | `Promise<void>` | Fills an input element with text. |
| `type()` | `text: string, options?: ...` | `Promise<void>` | Types text character by character into an element. |
| `press()` | `key: string, options?: ...` | `Promise<void>` | Simulates a key press. |
| `exists()` | `options?: { state?, timeout? }` | `Promise<boolean>` | Checks if at least one matching element exists. |
| `isVisible()` | | `Promise<boolean>` | Checks if the element is visible. |
| `inputValue()` | `options?: ...` | `Promise<string>` | Gets the value of an input element. |
| `filter()` | `filter: Filter` | `ElementController<Locator>` | Filters the current locator to find a more specific set of elements. |
| `locate()` | `selector: string \| ElementController, filter?: Filter` | `ElementController<Locator>` | Finds descendant elements matching a selector. |
| `waitFor()` | `state?: 'visible' \| 'attached' \| ..., options?: ...` | `Promise<void>` | Waits for the element to reach a specific state. |
| `getAll()` | | `Promise<ElementController<Locator>[]>` | Returns an array of controllers for all matching elements. |
| `boundingBox()` | `options?: ...` | `Promise<BoundingBox \| null>` | Returns the element's bounding box. |
