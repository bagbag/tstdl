# Playwright Controller Module

A high-level, controller-based wrapper for Playwright, designed to simplify web automation, scraping, and testing tasks within a dependency-injection-friendly architecture.

## Table of Contents

- [Features](#features)
- [Core Concepts](#core-concepts)
  - [Controller Hierarchy](#controller-hierarchy)
- [Usage](#usage)
  - [Installation](#installation)
  - [Configuration](#configuration)
  - [Basic Automation](#basic-automation)
  - [DI-Powered Lifecycle Management](#di-powered-lifecycle-management)
  - [Working with Persistent Contexts](#working-with-persistent-contexts)
  - [Locating and Filtering Elements](#locating-and-filtering-elements)
  - [Rendering a PDF](#rendering-a-pdf)
- [API Reference](#api-reference)
  - [`configureBrowser(options)`](#configurebrowseroptions)
  - [`BrowserService`](#browserservice)
  - [`BrowserController`](#browsercontroller)
  - [`BrowserContextController`](#browsercontextcontroller)
  - [`PageController` & `FrameController`](#pagecontroller--framecontroller)
  - [`ElementController`](#elementcontroller)

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
- **`PageController`**: Represents a single browser tab. This is the primary controller for interacting with a web page, including navigation, content evaluation, and element location.
- **`FrameController`**: Represents an `<iframe>` within a page. It provides the same interaction capabilities as a `PageController` but is scoped to the frame's content.
- **`ElementController`**: Wraps a Playwright `Locator` or `ElementHandle`. This is the workhorse for all element-level interactions like clicking, typing, and fetching attributes. It provides a rich set of methods for chaining, filtering, and asserting element states.

### Controller Hierarchy

The typical flow of control is:

`BrowserService` → `BrowserController` → `BrowserContextController` → `PageController` → `ElementController`

## Usage

### Installation

```bash
npm install @your-scope/playwright-controller # or your package manager
```

### Configuration

Before using the service, you can optionally configure default options for all new browser instances. This is useful for setting global settings like headless mode or browser type.

```typescript
import { configureBrowser } from '@your-scope/playwright-controller';

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
      }
    }
  },
});
```

### Basic Automation

The following example demonstrates a complete workflow: launching a browser, navigating to a page, interacting with elements, and cleaning up resources.

```typescript
import { Injector } from '#/injector/injector.js';
import { disposeAsync } from '#/disposable/disposable.js';
import { BrowserService, type BrowserController } from '@your-scope/playwright-controller';

// Assume DI container is configured
const browserService = Injector.get(BrowserService);

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
  await disposeAsync(browser);
}
```

### DI-Powered Lifecycle Management

`BrowserController` and `BrowserContextController` are injectable, allowing the DI container to manage their lifecycle automatically.

```typescript
import { Injectable, Inject } from '#/injector/decorators.js';
import { BrowserContextController } from '@your-scope/playwright-controller';

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
import { BrowserService } from '@your-scope/playwright-controller';
import { Injector } from '#/injector/injector.js';

const browserService = Injector.get(BrowserService);

// The first run will create the data directory and might require a login.
const context = await browserService.newPersistentContext('./user-data-dir');
const page = await context.newPage();

// ... perform login actions ...

await context.close();

// The second run reuses the session.
const context2 = await browserService.newPersistentContext('./user-data-dir');
// ... continue scraping as a logged-in user ...
```

### Locating and Filtering Elements

`ElementController` provides a rich API for locating and filtering elements.

```typescript
import { PageController } from '@your-scope/playwright-controller';

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

### Rendering a PDF

You can easily render a page as a PDF with various customization options.

```typescript
import { PageController } from '@your-scope/playwright-controller';
import { promises as fs } from 'fs';

async function savePageAsPdf(page: PageController) {
  await page.navigate('https://example.com');

  const pdfBuffer = await page.renderPdf({
    format: 'A4',
    landscape: false,
    renderBackground: true,
    margin: { top: '20px', bottom: '20px' },
  });

  await fs.writeFile('example.pdf', pdfBuffer);
  console.log('PDF saved successfully.');
}
```

## API Reference

This is a brief overview of the main classes and their key methods.

### `configureBrowser(options)`

Sets up global default options for the `BrowserService`. Call this once at application startup.

---

### `BrowserService`

A singleton service for managing browser instances. Usually resolved from a DI container.

- `newBrowser(options?: NewBrowserOptions): Promise<BrowserController>`: Launches a new browser instance.
- `newPersistentContext(dataDir: string, ...): Promise<BrowserContextController>`: Launches a browser with a persistent context, useful for saving session data.
- `[disposeAsync](): Promise<void>`: Closes all browsers and contexts created by the service.

---

### `BrowserController`

Controls a single browser instance. Can be resolved from a DI container.

- `newContext(options?: NewBrowserContextOptions): Promise<BrowserContextController>`: Creates a new, isolated browser context.
- `close(): Promise<void>`: Closes the browser and all its contexts.
- `[disposeAsync](): Promise<void>`: Alias for `close()`, enabling automatic disposal by a DI container.

---

### `BrowserContextController`

Controls an isolated browser session. Can be resolved from a DI container.

- `newPage(options?: NewPageOptions): Promise<PageController>`: Creates a new page (tab) within the context.
- `getState(): Promise<BrowserContextState>`: Gets the storage state (cookies, localStorage) of the context.
- `pages(): PageController[]`: Returns a list of all pages in the context.
- `attachLogger(logger: Logger): void`: Attaches a logger to log console messages and requests.
- `close(): Promise<void>`: Closes the browser context and all its pages.
- `[disposeAsync](): Promise<void>`: Alias for `close()`.

---

### `PageController` & `FrameController`

Controls a single page (tab) or an `<iframe>`. This is where most interactions happen.

- **Navigation**: `navigate(url, ...)`
- **Waiting**: `waitForUrl(...)`, `waitForLoadState(...)`, `waitForElement(...)`
- **Locating Elements**: `getByRole(...)`, `getByText(...)`, `getByLabel(...)`, `getBySelector(...)`, etc. These return an `ElementController`.
- **PDF**: `renderPdf(options?: PdfRenderOptions): Promise<Uint8Array>`, `renderPdfStream(...)`
- **Scrolling**: `scroll(deltaX, deltaY)`, `scrollTo(target)`
- **Lifecycle**: `close()`, `[disposeAsync]()`

---

### `ElementController`

The primary tool for interacting with DOM elements, wrapping Playwright's `Locator`.

- **Actions**: `click()`, `fill(text)`, `type(text)`, `press(key)`, `check()`, `uncheck()`, `hover()`, `focus()`.
- **State Assertions**: `exists()`, `isVisible()`, `isHidden()`, `isEnabled()`, `isDisabled()`, `isChecked()`.
- **Chaining & Filtering**: `locate(selector)`, `filter(options)`, `and(controller)`, `or(controller)`, `first()`, `last()`, `nth(index)`.
- **Data Extraction**: `evaluate(fn)`, `inputValue()`, `boundingBox()`.
- **Waiting**: `waitFor(state, options)`: Waits for the element to reach a specific state (e.g., 'visible', 'attached').