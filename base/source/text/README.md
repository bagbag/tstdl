# @tstdl/base/text

A powerful, reactive, and type-safe text localization module for TypeScript applications, built with signals.

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
  - [6. Localizing Enums](#6-localizing-enums)
  - [7. Resolving Text in Complex Objects](#7-resolving-text-in-complex-objects)
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

The module introduces the `DynamicText` type, which is a reactive value (`T | Signal<T> | Observable<T>`) that can be resolved into a localized string.

The core function `resolveDynamicText` takes a `DynamicText` and returns a `Signal<string>`. This signal automatically updates its value whenever:

1. The source signal/observable emits a new value.
2. The active language in the `LocalizationService` changes.

This architecture makes it incredibly simple to build UIs that respond to language changes without any manual re-rendering logic.

### Type-Safe Keys

Instead of using raw strings for keys (e.g., `'app.title'`), which are prone to typos, you can use the `getLocalizationKeys()` helper. This function returns a deep proxy that mirrors your `keys` object structure, providing full type-safety and autocompletion in your IDE.

```typescript
// Define your localization structure
type AppLocalization = Localization<{
  user: {
    greeting: LocalizeItem<{ name: string }>;
  };
}>;

// Get the type-safe keys
const localizationKeys = getLocalizationKeys<AppLocalization>();

// Use the key with full type-safety.
// TypeScript knows `localizationKeys.user.greeting` exists and requires a `name` parameter.
const greetingData = localizationData(localizationKeys.user.greeting, { name: 'Alice' });
```

## Usage

### 1. Defining Localizations

First, define your localization objects. It's best practice to use the `getLocalizationKeys` helper to create a typed proxy for your keys.

```typescript
import { getLocalizationKeys, type Localization, type LocalizeItem, enumerationLocalization } from '@tstdl/base/text';

// Define a custom enum for user roles
export const UserRole = {
  Admin: 'admin',
  User: 'user',
} as const;

// Define the type for our localization structure for type-safety
type AppLocalization = Localization<
  {
    app: {
      title: LocalizeItem;
      welcome: LocalizeItem<{ name: string }>;
    };
  },
  [typeof UserRole]
>;

// Create a typed proxy for our keys
export const T = getLocalizationKeys<AppLocalization>();

// Create the English localization
export const englishLocalization: AppLocalization = {
  language: { code: 'en', name: 'English' },
  keys: {
    app: {
      title: 'My Awesome App',
      welcome: 'Welcome, {{name}}!',
    },
  },
  enums: [
    enumerationLocalization(UserRole, 'User Role', {
      [UserRole.Admin]: 'Administrator',
      [UserRole.User]: 'Standard User',
    }),
  ],
};

// Create the German localization
export const germanLocalization: AppLocalization = {
  language: { code: 'de', name: 'Deutsch' },
  keys: {
    app: {
      title: 'Meine Tolle App',
      welcome: 'Willkommen, {{name}}!',
    },
  },
  enums: [
    enumerationLocalization(UserRole, 'Benutzerrolle', {
      [UserRole.Admin]: 'Administrator',
      [UserRole.User]: 'Standardbenutzer',
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
import { localizationKeys } from './localizations';

const title = localizationService.localizeOnce(localizationKeys.app.title);
console.log(title); // Output: 'My Awesome App'

// Switch language
localizationService.setLanguage('de');

const germanTitle = localizationService.localizeOnce(T.app.title);
console.log(germanTitle); // Output: 'Meine Tolle App'
```

### 4. Reactive Usage with Signals

Use `resolveDynamicText` to get a `Signal` that automatically updates.

```typescript
import { resolveDynamicText } from '@tstdl/base/text';
import { localizationKeys } from './localizations';

// `titleSignal` is a Signal<string>
const titleSignal = resolveDynamicText(localizationKeys.app.title);

console.log(titleSignal()); // 'My Awesome App'

// Change the language in the service
localizationService.setLanguage('de');

// The signal's value automatically updates!
console.log(titleSignal()); // 'Meine Tolle App'
```

### 5. Using Parameterized Text

The `localizationData` helper creates a data object for keys that require parameters. `resolveDynamicText` handles these reactively as well, even when the parameters themselves are reactive.

```typescript
import { computed, signal } from '@tstdl/base/signals';
import { resolveDynamicText, localizationData } from '@tstdl/base/text';
import { localizationKeys } from './localizations';

const username = signal('Alice');

// Create a signal that produces the localization data object.
// This recomputes whenever `username` changes.
const welcomeTextData = computed(() => localizationData(localizationKeys.app.welcome, { name: username() }));

// Resolve it to the final string signal.
// This signal updates when `welcomeTextData` changes OR when the language changes.
const welcomeMessage = resolveDynamicText(welcomeTextData);

console.log(welcomeMessage()); // 'Welcome, Alice!'

// Update the source signal
username.set('Bob');
console.log(welcomeMessage()); // 'Welcome, Bob!'

// Change the language
localizationService.setLanguage('de');
console.log(welcomeMessage()); // 'Willkommen, Bob!'
```

### 6. Localizing Enums

Use `localizeEnum` to get a reactive translation for an enum value or its title.

```typescript
import { localizeEnum } from '@tstdl/base/text';
import { UserRole } from './localizations';

// Get a reactive translation for a specific enum value
const roleSignal = localizeEnum(UserRole, UserRole.Admin);
console.log(roleSignal()); // 'Administrator'

// Get a reactive translation for the enum's name/title
const roleNameSignal = localizeEnum(UserRole);
console.log(roleNameSignal()); // 'User Role'

localizationService.setLanguage('de');

console.log(roleSignal()); // 'Administrator'
console.log(roleNameSignal()); // 'Benutzerrolle'
```

### 7. Resolving Text in Complex Objects

When working with lists of items, `resolveNestedDynamicTexts` can efficiently localize a property on each object.

```typescript
import { signal } from '@tstdl/base/signals';
import { resolveNestedDynamicTexts, type DynamicText, localizationData } from '@tstdl/base/text';
import { localizationKeys } from './localizations';

interface User {
  id: number;
  name: string;
  // The greeting is a DynamicText containing localization data
  greeting: DynamicText;
}

const users = signal<User[]>([
  { id: 1, name: 'Alice', greeting: localizationData(localizationKeys.app.welcome, { name: 'Alice' }) },
  { id: 2, name: 'Bob', greeting: localizationData(localizationKeys.app.welcome, { name: 'Bob' }) },
]);

// This creates a signal of users where `greeting` is now a localized string.
// It will update if the users array changes or if the language changes.
const resolvedUsers = resolveNestedDynamicTexts(users(), 'greeting');

console.log(resolvedUsers()[0].greeting); // 'Welcome, Alice!'

localizationService.setLanguage('de');

console.log(resolvedUsers()[0].greeting); // 'Willkommen, Alice!'
```

## API Summary

### LocalizationService Methods

| Method                 | Arguments                                        | Return Type          | Description                                                                |
| :--------------------- | :----------------------------------------------- | :------------------- | :------------------------------------------------------------------------- |
| `registerLocalization` | `...localizations: Localization[]`               | `void`               | Registers one or more `Localization` objects with the service.             |
| `setLanguage`          | `languageOrCode: Language \| string`             | `void`               | Sets the active language by its code or object.                            |
| `localizeOnce`         | `data: LocalizationData<T>`                      | `string`             | Resolves `LocalizationData` to a string once for the current language.     |
| `localize`             | `data: LocalizationData<T>`                      | `Signal<string>`     | Reactively resolves `LocalizationData` to a string signal.                 |
| `localize$`            | `data: LocalizationData<T>`                      | `Observable<string>` | RxJS-friendly version of `localize`.                                       |
| `localizeEnumOnce`     | `enum: E, value?: V, params?: any`               | `string`             | Resolves an enum value (or its name if value is omitted) to a string once. |
| `localizeEnum`         | `enum: E, value?: V, params?: any`               | `Signal<string>`     | Reactively resolves an enum value/name to a string signal.                 |
| `localizeEnum$`        | `enum: E, value?: V, params?: any`               | `Observable<string>` | RxJS-friendly version of `localizeEnum`.                                   |
| `hasKey`               | `keyOrData: LocalizationKey \| LocalizationData` | `boolean`            | Checks if a translation exists for the given key in the active language.   |
| `hasLanguage`          | `code: string`                                   | `boolean`            | Checks if a language with the given code is registered.                    |

### Helper Functions

| Function                    | Arguments                            | Return Type                       | Description                                                                   |
| :-------------------------- | :----------------------------------- | :-------------------------------- | :---------------------------------------------------------------------------- |
| `resolveDynamicText`        | `text: DynamicText`                  | `Signal<string>`                  | Resolves a `DynamicText` value into a reactive string signal.                 |
| `resolveDynamicText$`       | `text: DynamicText`                  | `Observable<string>`              | RxJS-friendly version of `resolveDynamicText`.                                |
| `resolveDynamicTexts`       | `texts: DynamicText[]`               | `Signal<string[]>`                | Resolves an array of `DynamicText` values into a reactive signal of strings.  |
| `resolveNestedDynamicTexts` | `items: T[], key: K`                 | `Signal<T[]>`                     | Takes an array of objects and resolves a `DynamicText` property on each item. |
| `getLocalizationKeys`       | `<T extends Localization>()`         | `Proxy`                           | Returns a deep proxy for creating type-safe localization keys.                |
| `localizationData`          | `key: LocalizationKey<T>, params: T` | `LocalizationDataObject<T>`       | Creates a data object for keys with parameters.                               |
| `enumerationLocalization`   | `enum, [name], values`               | `EnumerationLocalizationEntry<T>` | A helper to structure enum localizations for registration.                    |
