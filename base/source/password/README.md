# Password Strength Checker

A TypeScript module for robust password strength estimation, combining the advanced analysis of `zxcvbn-ts` with checks against the "Have I Been Pwned" database.

## Table of Contents

- [Features](#features)
- [Core Concepts](#core-concepts)
- [Usage](#usage)
- [API Reference](#api-reference)

## Features

-   **Comprehensive Strength Analysis:** Utilizes `zxcvbn-ts` to evaluate passwords against common patterns, dictionary words, keyboard sequences, and more.
-   **Pwned Password Check:** Securely checks if a password has been exposed in a data breach via the "Have I Been Pwned" service.
-   **Simple Scoring:** Provides a clear strength score from 0 (Very Weak) to 4 (Very Strong).
-   **Actionable Feedback:** Returns localized warnings and suggestions to help users choose better passwords.
-   **Secure by Design:** Uses the k-Anonymity model to query the "Have I Been Pwned" API, ensuring the full password hash is never transmitted.
-   **Lightweight:** Dynamically loads `zxcvbn-ts` and its language packs on first use to minimize initial bundle size.

## Core Concepts

This module provides a unified function, `checkPassword`, to assess the security of a password. Its evaluation is based on two primary mechanisms:

### 1. zxcvbn-ts Analysis

The core of the strength estimation comes from the powerful `zxcvbn-ts` library. It analyzes a password by attempting to match it against various patterns, including:
-   Dictionary words (from multiple languages)
-   Common names and surnames
-   Well-known keyboard patterns (e.g., `qwerty`, `asdfg`)
-   Repeated characters and sequences (e.g., `aaaa`, `12345`)
-   Dates and common years

Based on this analysis, `zxcvbn-ts` assigns a score from 0 to 4 and provides feedback, which this module translates into localized warnings and suggestions.

### 2. "Have I Been Pwned" (HIBP) Check

To protect against the use of compromised credentials, the module can check the password against the "Have I Been Pwned" Pwned Passwords database. This check is performed securely using a **k-Anonymity** model:

1.  The password is hashed using SHA-1.
2.  Only the first 5 characters of the hexadecimal hash are sent to the HIBP API.
3.  The API returns a list of all hash suffixes that share the same 5-character prefix, along with their pwned counts.
4.  The module searches for the password's hash suffix within the returned list locally.

If a match is found, it means the password has been exposed. In this case, the password strength is automatically considered **Very Weak (score 0)**, regardless of the `zxcvbn-ts` result. This check can be disabled for performance or offline scenarios.

## Usage

Install the module and its peer dependency:

```bash
npm install @your-scope/password-check @zxcvbn-ts/core
```

### Basic Example

Here is a basic example of how to check a password and interpret the results.

```typescript
import { checkPassword, PasswordStrength } from '@your-scope/password-check';

async function evaluatePassword(password: string) {
  try {
    const result = await checkPassword(password);

    console.log(`Password Strength: ${PasswordStrength[result.strength]}`); // e.g., "Medium"

    if (result.pwned) {
      console.log(`This password has been pwned ${result.pwned} times!`);
    }

    if (result.warnings.length > 0) {
      console.log('Warnings:');
      // Note: result.warnings contains localization keys.
      // You would use a localization service to display the actual messages.
      result.warnings.forEach(warningKey => console.log(`- ${warningKey}`));
    }

    if (result.suggestions.length > 0) {
      console.log('Suggestions:');
      result.suggestions.forEach(suggestionKey => console.log(`- ${suggestionKey}`));
    }

  } catch (error) {
    console.error('An error occurred during password check:', error);
  }
}

evaluatePassword('Tr0ub4dour&3');
evaluatePassword('password123');
```

### Disabling the "Have I Been Pwned" Check

For environments without internet access or where maximum performance is critical, you can disable the remote API call.

```typescript
import { checkPassword } from '@your-scope/password-check';

async function evaluatePasswordOffline(password: string) {
  const result = await checkPassword(password, { checkForPwned: false });

  // The result.pwned property will be undefined
  console.log(`Password Strength Score: ${result.strength}`);
}

evaluatePasswordOffline('a-very-secure-offline-password!');
```

## API Reference

### `checkPassword(password, options?)`

Asynchronously checks the strength of a password.

-   **`password: string`**: The password to check.
-   **`options?: CheckPasswordOptions`**:
    -   `checkForPwned?: boolean`: If `true`, checks against the HIBP database. Defaults to `true`.
-   **Returns**: `Promise<PasswordCheckResult>`

### `haveIBeenPwned(password)`

A lower-level function to check *only* if a password has been pwned.

-   **`password: string`**: The password to check.
-   **Returns**: `Promise<number>` - The number of times the password was found in the HIBP database. Returns `0` if not found. Throws on network error.

### `class PasswordCheckResult`

The result object returned by `checkPassword`.

-   **`strength: PasswordStrength`**: An enum value indicating the password's strength (from `VeryWeak` to `VeryStrong`).
-   **`pwned?: number`**: How many times the password appeared in the HIBP dataset. `undefined` if the check was disabled or failed.
-   **`warnings: string[]`**: An array of localization keys for warnings about the password's weaknesses.
-   **`suggestions: string[]`**: An array of localization keys for suggestions on how to improve the password.

### `enum PasswordStrength`

An enum representing the calculated strength score.

-   `VeryWeak = 0`
-   `Weak = 1`
-   `Medium = 2`
-   `Strong = 3`
-   `VeryStrong = 4`

### Localization Data

The module exports pre-configured localization objects that can be used with a localization service to display user-friendly feedback.

-   `germanPasswordCheckLocalization: PasswordCheckLocalization`
-   `englishPasswordCheckLocalization: PasswordCheckLocalization`