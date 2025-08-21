# @tstdl/base/text

A powerful, reactive, and type-safe text localization module for TypeScript applications, built on signals.

## Table of Contents

- [Features](#features)
- [Core Concepts](#core-concepts)
  - [LocalizationService](#localizationservice)
  - [Localization Definitions](#localization-definitions)
  - [DynamicText: Reactive Localization](#dynamictext-reactive-localization)
  - [Type-Safe Keys](#type-safe-keys)
- [Usage](#usage)
  - [1. Defining Localizations](#1-defining-localizations)
  - [2. Registering with the Service](#2-registering-with-the-service)
  - [3. Basic (Non-Reactive) Usage](#3-basic-non-reactive-usage)
  - [4. Reactive Usage with Signals](#4-reactive-usage-with-signals)
  - [5. Using Parameterized Text](#5-using-parameterized-text)
  - [6. Complex Logic with Functions](#6-complex-logic-with-functions)
  - [7. Localizing Enums](#7-localizing-enums)
  - [8. Resolving Text in Complex Objects](#8-resolving-text-in-complex-objects)
- [API Summary](#api-summary)

## Features

- **Type-Safe:** Leverage TypeScript's inference to provide compile-time safety and autocompletion for localization keys.
- **Reactive:** Built with signals for seamless, automatic UI updates when the active language changes.
- **Flexible:** Supports plain strings, parameterized strings (e.g., `Hello, {{name}}`), and complex localization functions.
- **Observable/Signal Integration:** Works out-of-the-box with `Signal` and `Observable` values.
- **Enum Support:** Helper utilities to easily localize enumerations.
- **Dependency Injection Friendly:** Designed as a singleton service for easy integration.

## Core Concepts

### LocalizationService

The `LocalizationService` is the central hub for all localization tasks. It's a singleton service that you use to:

- Register all your application's `Localization` definitions (one for each language).
- Set and get the current active language.
- Resolve localization keys into displayable strings, both reactively and non-reactively.

### Localization Definitions

A localization is defined in a `Localization` object, which has three main parts:

- `language`: An object containing the language `code` (e.g., 'en') and `name` (e.g., 'English').
- `keys`: A nested object structure where each leaf is a `LocalizeItem`. A `LocalizeItem` can be a simple string, a parameterized string (`'Welcome, {{user}}'`), or a function for complex logic.
- `enums`: An array for defining translations for TypeScript `enum` types.

### DynamicText: Reactive Localization

The module introduces the `DynamicText` type, which represents a value that can be resolved into a localized string. It can be a static value, a `Signal`, or an `Observable`.

The core function `resolveDynamicText` takes a `DynamicText` and returns a `Signal<string>`. This signal automatically updates its value whenever:

1. The source signal/observable emits a new value.
2. The active language in the `LocalizationService` changes.

This architecture makes it incredibly simple to build UIs that respond to language changes without any manual re-rendering logic.

### Type-Safe Keys

Instead of using raw strings for keys (e.g., `'product.details'`), which are prone to typos, you can use the `getLocalizationKeys()` helper. This function returns a deep proxy that mirrors your `keys` object structure, providing full type-safety and autocompletion in your IDE.

```typescript
// Define your localization structure
type AppLocalization = Localization<{
  product: {
    notifications: {
      addedToCart: LocalizeItem<{ productName: string }>;
    };
  };
}>;

// Get the type-safe keys
const T = getLocalizationKeys<AppLocalization>();

// Use the key with full type-safety.
// TypeScript knows `T.product.notifications.addedToCart` exists
// and that `localizationData` requires a `productName` parameter.
const notification = localizationData(T.product.notifications.addedToCart, { productName: 'Super Widget' });
```

## Usage

### 1. Defining Localizations

First, define your localization objects. It's best practice to use the `getLocalizationKeys` helper to create a typed proxy for your keys.

```typescript
import { getLocalizationKeys, type Localization, type LocalizeItem, enumerationLocalization } from '@tstdl/base/text';

// Define a custom enum
export const ProductStatus = {
  InStock: 'in-stock',
  OutOfStock: 'out-of-stock',
} as const;

// Define the type for our localization structure for full type-safety
type AppLocalization = Localization<
  {
    product: {
      details: LocalizeItem;
      notifications: {
        addedToCart: LocalizeItem<{ productName: string }>;
      };
      // Example of a function for complex logic (pluralization)
      stock: LocalizeItem<{ count: number }>;
    };
  },
  [typeof ProductStatus] // Register enums here
>;

// Create a typed proxy for our keys
export const T = getLocalizationKeys<AppLocalization>();

// Create the English localization
export const englishLocalization: AppLocalization = {
  language: { code: 'en', name: 'English' },
  keys: {
    product: {
      details: 'Product Details',
      notifications: {
        addedToCart: '{{productName}} was added to your cart.',
      },
      stock: ({ count }) => {
        if (count === 1) return '1 item in stock.';
        return `${count} items in stock.`;
      },
    },
  },
  enums: [
    enumerationLocalization(ProductStatus, 'Status', {
      [ProductStatus.InStock]: 'In Stock',
      [ProductStatus.OutOfStock]: 'Out of Stock',
    }),
  ],
};

// Create the German localization
export const germanLocalization: AppLocalization = {
  language: { code: 'de', name: 'Deutsch' },
  keys: {
    product: {
      details: 'Produktdetails',
      notifications: {
        addedToCart: '{{productName}} wurde dem Warenkorb hinzugefügt.',
      },
      stock: ({ count }) => {
        if (count === 1) return '1 Stück auf Lager.';
        return `${count} Stück auf Lager.`;
      },
    },
  },
  enums: [
    enumerationLocalization(ProductStatus, 'Status', {
      [ProductStatus.InStock]: 'Auf Lager',
      [ProductStatus.OutOfStock]: 'Nicht verfügbar',
    }),
  ],
};
```

### 2. Registering with the Service

Inject the `LocalizationService` and register your defined localizations.

```typescript
import { inject } from '@tstdl/base/injector';
import { LocalizationService } from '@tstdl/base/text';
import { englishLocalization, germanLocalization } from './localizations';

const localizationService = inject(LocalizationService);

// Register all available languages
localizationService.registerLocalization(englishLocalization, germanLocalization);

// Set the initial language (e.g., 'en')
localizationService.setLanguage('en');
```

### 3. Basic (Non-Reactive) Usage

To get a single, non-reactive string, use `localizeOnce()`.

```typescript
import { T } from './localizations'; // T is the typed keys proxy

// Get a single, non-reactive string
const title = localizationService.localizeOnce(T.product.details);
console.log(title); // Output: 'Product Details'

// Switch language
localizationService.setLanguage('de');

const germanTitle = localizationService.localizeOnce(T.product.details);
console.log(germanTitle); // Output: 'Produktdetails'
```

### 4. Reactive Usage with Signals

Use `resolveDynamicText` to get a `Signal` that automatically updates.

```typescript
import { resolveDynamicText } from '@tstdl/base/text';
import { T } from './localizations';

// `titleSignal` is a Signal<string>
const titleSignal = resolveDynamicText(T.product.details);

console.log(titleSignal()); // 'Product Details'

// Change the language in the service
localizationService.setLanguage('de');

// The signal's value automatically updates!
console.log(titleSignal()); // 'Produktdetails'
```

### 5. Using Parameterized Text

The `localizationData` helper creates a data object for keys that require parameters. `resolveDynamicText` handles these reactively as well, even when the parameters themselves are reactive.

```typescript
import { computed, signal } from '@tstdl/base/signals';
import { resolveDynamicText, localizationData } from '@tstdl/base/text';
import { T } from './localizations';

const productName = signal('Super Widget');

// Create a signal that produces the localization data object.
// This recomputes whenever `productName` changes.
const notificationData = computed(() =>
  localizationData(T.product.notifications.addedToCart, { productName: productName() })
);

// Resolve it to the final string signal.
// This signal updates when `notificationData` changes OR when the language changes.
const notificationMessage = resolveDynamicText(notificationData);

console.log(notificationMessage()); // 'Super Widget was added to your cart.'

// Update the source signal
productName.set('Mega Gadget');
console.log(notificationMessage()); // 'Mega Gadget was added to your cart.'

// Change the language
localizationService.setLanguage('de');
console.log(notificationMessage()); // 'Mega Gadget wurde dem Warenkorb hinzugefügt.'
```

### 6. Complex Logic with Functions

For logic like pluralization, you can define a `LocalizeItem` as a function.

```typescript
import { computed, signal } from '@tstdl/base/signals';
import { localizationData, resolveDynamicText } from '@tstdl/base/text';
import { T } from './localizations';

const stockCount = signal(5);

const stockData = computed(() =>
  localizationData(T.product.stock, { count: stockCount() })
);

const stockMessage = resolveDynamicText(stockData);

console.log(stockMessage()); // '5 items in stock.'

stockCount.set(1);
console.log(stockMessage()); // '1 item in stock.'

localizationService.setLanguage('de');
console.log(stockMessage()); // '1 Stück auf Lager.'
```

### 7. Localizing Enums

Use `localizeEnum` to get a reactive translation for an enum value or its title.

```typescript
import { localizeEnum } from '@tstdl/base/text';
import { ProductStatus } from './localizations';

// Get a reactive translation for a specific enum value
const statusSignal = localizeEnum(ProductStatus, ProductStatus.InStock);
console.log(statusSignal()); // 'In Stock'

// Get a reactive translation for the enum's name/title
const statusNameSignal = localizeEnum(ProductStatus);
console.log(statusNameSignal()); // 'Status'

localizationService.setLanguage('de');

console.log(statusSignal()); // 'Auf Lager'
console.log(statusNameSignal()); // 'Status'
```

### 8. Resolving Text in Complex Objects

When working with lists of items, `resolveNestedDynamicTexts` can efficiently localize a property on each object.

```typescript
import { signal } from '@tstdl/base/signals';
import { resolveNestedDynamicTexts, type DynamicText, localizationData } from '@tstdl/base/text';
import { T } from './localizations';

interface Product {
  id: number;
  name: string;
  // The notification is a DynamicText containing localization data
  notification: DynamicText;
}

const products = signal<Product[]>([
  { id: 1, name: 'Super Widget', notification: localizationData(T.product.notifications.addedToCart, { productName: 'Super Widget' }) },
  { id: 2, name: 'Mega Gadget', notification: localizationData(T.product.notifications.addedToCart, { productName: 'Mega Gadget' }) },
]);

// This creates a signal of users where `notification` is now a localized string.
// It will update if the products array changes or if the language changes.
const resolvedProducts = resolveNestedDynamicTexts(products(), 'notification');

console.log(resolvedProducts()[0].notification); // 'Super Widget was added to your cart.'

localizationService.setLanguage('de');

console.log(resolvedProducts()[0].notification); // 'Super Widget wurde dem Warenkorb hinzugefügt.'
```

## API Summary

### LocalizationService Methods

| Method | Arguments | Return Type | Description |
| :--- | :--- | :--- | :--- |
| `registerLocalization` | `...localizations: Localization[]` | `void` | Registers one or more `Localization` objects with the service. |
| `setLanguage` | `languageOrCode: Language \| string` | `void` | Sets the active language by its code or object. |
| `localizeOnce` | `data: LocalizationData<T>` | `string` | Resolves `LocalizationData` to a string once for the current language. |
| `localize` | `data: LocalizationData<T>` | `Signal<string>` | Reactively resolves `LocalizationData` to a string signal. |
| `localize$` | `data: LocalizationData<T>` | `Observable<string>` | RxJS-friendly version of `localize`. |
| `localizeEnumOnce` | `enum, value?, params?` | `string` | Resolves an enum value (or its name if value is omitted) to a string once. |
| `localizeEnum` | `enum, value?, params?` | `Signal<string>` | Reactively resolves an enum value/name to a string signal. |
| `localizeEnum$` | `enum, value?, params?` | `Observable<string>` | RxJS-friendly version of `localizeEnum`. |
| `hasKey` | `keyOrData: LocalizationKey \| LocalizationData` | `boolean` | Checks if a translation exists for the given key in the active language. |
| `hasLanguage` | `code: string` | `boolean` | Checks if a language with the given code is registered. |

### Helper Functions

| Function | Arguments | Return Type | Description |
| :--- | :--- | :--- | :--- |
| `resolveDynamicText` | `text: DynamicText` | `Signal<string>` | Resolves a `DynamicText` value into a reactive string signal. |
| `resolveDynamicText$` | `text: DynamicText` | `Observable<string>` | RxJS-friendly version of `resolveDynamicText`. |
| `resolveDynamicTexts` | `texts: DynamicText[]` | `Signal<string[]>` | Resolves an array of `DynamicText` values into a reactive signal of strings. |
| `resolveDynamicTexts$` | `texts: DynamicText[]` | `Observable<string[]>` | RxJS-friendly version of `resolveDynamicTexts`. |
| `resolveNestedDynamicText` | `item: T, key: K` | `Signal<T>` | Takes an object and resolves a `DynamicText` property on it. |
| `resolveNestedDynamicText$`| `item: T, key: K` | `Observable<T>` | RxJS-friendly version of `resolveNestedDynamicText`. |
| `resolveNestedDynamicTexts`| `items: T[], key: K`| `Signal<T[]>` | Takes an array of objects and resolves a `DynamicText` property on each item. |
| `resolveNestedDynamicTexts$`| `items: T[], key: K`| `Observable<T[]>` | RxJS-friendly version of `resolveNestedDynamicTexts`. |
| `getLocalizationKeys` | `<T extends Localization>()` | `Proxy` | Returns a deep proxy for creating type-safe localization keys. |
| `localizationData` | `key, params` | `LocalizationDataObject<T>` | Creates a data object for keys with parameters. |
| `enumerationLocalization` | `enum, [name], values` | `EnumerationLocalizationEntry<T>` | A helper to structure enum localizations for registration. |