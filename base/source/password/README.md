# Password Module

A TypeScript module for robust password strength estimation, combining the advanced analysis of `zxcvbn-ts` with checks against the "Have I Been Pwned" database.

## Table of Contents

- [Features](#features)
- [Core Concepts](#core-concepts)
- [Usage](#usage)
- [API Summary](#api-summary)

## Features

- **Comprehensive Strength Analysis:** Utilizes `zxcvbn-ts` to evaluate passwords against common patterns, dictionary words, keyboard sequences, and more.
- **Pwned Password Check:** Securely checks if a password has been exposed in a data breach via the "Have I Been Pwned" service.
- **Simple Scoring:** Provides a clear strength score from 0 (Very Weak) to 4 (Very Strong).
- **Actionable Feedback:** Returns localized warnings and suggestions to help users choose better passwords.
- **Secure by Design:** Uses the k-Anonymity model to query the "Have I Been Pwned" API, ensuring the full password hash is never transmitted.
- **Lightweight:** Dynamically loads `zxcvbn-ts` and its language packs on first use to minimize initial bundle size.
- **Robust:** Includes a timeout for the "Have I Been Pwned" check to prevent long waits on network issues.

## Core Concepts

This module provides a unified function, `checkPassword`, to assess the security of a password. Its evaluation is based on two primary mechanisms:

### 1. zxcvbn-ts Analysis

The core of the strength estimation comes from the powerful `zxcvbn-ts` library. It analyzes a password by attempting to match it against various patterns, including:

- Dictionary words (from multiple languages)
- Common names and surnames
- Well-known keyboard patterns (e.g., `qwerty`, `asdfg`)
- Repeated characters and sequences (e.g., `aaaa`, `12345`)
- Dates and common years

Based on this analysis, `zxcvbn-ts` assigns a score from 0 to 4 and provides feedback, which this module translates into localized warnings and suggestions.

### 2. "Have I Been Pwned" (HIBP) Check

To protect against the use of compromised credentials, the module checks the password against the "Have I Been Pwned" Pwned Passwords database. This check is performed securely using a **k-Anonymity** model:

1.  The password is hashed using SHA-1.
2.  Only the first 5 characters of the hexadecimal hash are sent to the HIBP API.
3.  The API returns a list of all hash suffixes that share the same 5-character prefix, along with their pwned counts.
4.  The module searches for the password's hash suffix within the returned list locally.

If a match is found, it means the password has been exposed. In this case, the password strength is automatically considered **Very Weak (score 0)**, regardless of the `zxcvbn-ts` result. This check can be disabled for performance or offline scenarios and will time out gracefully if the API is unresponsive.

## Usage

### Basic Example

Here is a basic example of how to check a password. The `warnings` and `suggestions` in the result are localization keys, which can be used with a localization service to display user-friendly messages.

```typescript
import { checkPassword, PasswordStrength, englishPasswordCheckLocalization } from '@tstdl/base/password';
import { LocalizationService } from '@tstdl/base/text';

// Initialize a localization service with the desired language pack
const localizationService = new LocalizationService([englishPasswordCheckLocalization]);

async function evaluatePassword(password: string) {
  try {
    const result = await checkPassword(password);

    console.log(`Password Strength: ${PasswordStrength[result.strength]}`); // e.g., "Weak"

    if (result.pwned) {
      console.log(`This password has been pwned ${result.pwned} times!`);
    }

    if (result.warnings.length > 0) {
      console.log('Warnings:');
      // Use the localizationService to display user-friendly messages
      result.warnings.forEach((warningKey) => console.log(`- ${localizationService.localize(warningKey)}`));
    }

    if (result.suggestions.length > 0) {
      console.log('Suggestions:');
      result.suggestions.forEach((suggestionKey) => console.log(`- ${localizationService.localize(suggestionKey)}`));
    }
  } catch (error) {
    console.error('An error occurred during password check:', error);
  }
}

evaluatePassword('password123');
```

### Disabling the "Have I Been Pwned" Check

For environments without internet access or where maximum performance is critical, you can disable the remote API call.

```typescript
import { checkPassword } from '@tstdl/base/password';

async function evaluatePasswordOffline(password: string) {
  const result = await checkPassword(password, { checkForPwned: false });

  // The result.pwned property will be undefined
  console.log(`Password Strength Score: ${result.strength}`);
}

evaluatePasswordOffline('a-very-secure-offline-password!');
```

## API Summary

| Function / Class                   | Arguments / Properties                                                                              | Return Type                    | Description                                                                                    |
| :--------------------------------- | :-------------------------------------------------------------------------------------------------- | :----------------------------- | :--------------------------------------------------------------------------------------------- |
| `checkPassword`                    | `password: string`<br>`options?: { checkForPwned?: boolean }`                                       | `Promise<PasswordCheckResult>` | Asynchronously checks password strength using zxcvbn-ts and optionally the HIBP database.      |
| `haveIBeenPwned`                   | `password: string`                                                                                  | `Promise<number>`              | Checks a password against the HIBP database and returns the number of times it has been pwned. |
| `PasswordCheckResult`              | `strength: PasswordStrength`<br>`pwned?: number`<br>`warnings: string[]`<br>`suggestions: string[]` | `PasswordCheckResult`          | The result object returned by `checkPassword`. Warnings and suggestions are localization keys. |
| `PasswordStrength`                 | (Enum)                                                                                              | `enum`                         | An enum representing password strength from `VeryWeak` (0) to `VeryStrong` (4).                |
| `englishPasswordCheckLocalization` | -                                                                                                   | `PasswordCheckLocalization`    | English localization data for warnings and suggestions.                                        |
| `germanPasswordCheckLocalization`  | -                                                                                                   | `PasswordCheckLocalization`    | German localization data for warnings and suggestions.                                         |
