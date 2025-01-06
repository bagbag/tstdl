import { isDefined, isNullOrUndefined } from '../type-guards.js';

export type NormalizeTextOptions = {
  /**
   * Remove leading and trailing whitespace
   */
  trim?: boolean,

  /**
   * Lowercase all characters
   */
  lowercase?: boolean,

  /**
   * Remove multiple consecutive whitespace characters
   */
  multipleWhitespace?: boolean,

  /**
   * Remove diacritics (è -> e)
   *
   * applies unicode NFD normalization and removes diacritics
   * @see unicode option
   */
  diacritics?: boolean,

  /**
   * Replace ligatures with their consecutive characters (æ -> ae)
   *
   * applies unicode NFKC normalization
   * @see unicode option
   */
  ligatures?: boolean,

  /**
   * Unicode normalization
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/normalize
   */
  unicode?: 'NFC' | 'NFD' | 'NFKC' | 'NFKD'
};

/**
 * Trims, lowercases, replaces multi-character whitespace with a single space and unicode normalization
 * @param text text to normalize
 * @param options specify what to normalize. Defaults to all except unicode
 * @returns normalized text
 */
export function normalizeText(text: string, options: NormalizeTextOptions = { trim: true, lowercase: true, multipleWhitespace: true, diacritics: true, ligatures: true }): string {
  let normalized = text;

  if (options.trim == true) {
    normalized = normalized.trim();
  }

  if (options.lowercase == true) {
    normalized = normalized.toLowerCase();
  }

  if (options.multipleWhitespace == true) {
    normalized = normalized.replace(/\s+/ug, ' ');
  }

  if (options.diacritics == true) {
    normalized = normalized.normalize('NFD').replace(/\p{Diacritic}/ug, '');
  }

  if (options.ligatures == true) {
    normalized = normalized.normalize('NFKC');
  }

  if (isDefined(options.unicode)) {
    normalized = normalized.normalize(options.unicode);
  }

  return normalized;
}

/**
 * Normalizes text input by trimming whitespace and returning null if text is empty.
 *
 * @param text The input text to normalize
 * @param allowNull If true, null or undefined input (or input that becomes empty after trimming) will return null. If false, an error will be thrown in these cases. Defaults to true.
 * @returns The trimmed string. If allowNull is true and the input is null, undefined, or empty after trimming, returns null.
 * @throws {Error} If allowNull is false and the input is null, undefined, or empty after trimming.
 */
export function normalizeTextInput(text: string | null | undefined, allowNull?: true): string | null;
export function normalizeTextInput(text: string | null | undefined, allowNull: false): string;
export function normalizeTextInput(text: string | null | undefined, allowNull?: boolean): string | null {
  const normalized = text?.trim();

  if (isNullOrUndefined(normalized) || (normalized.length == 0)) {
    if (allowNull == false) {
      throw new Error('Invalid input.');
    }

    return null;
  }

  return normalized;
}
