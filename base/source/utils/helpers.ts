/* eslint-disable @typescript-eslint/ban-types */

import { supportsNotification } from '#/supports.js';
import { DetailsError } from '../errors/details.error.js';
import type { DeepArray, Record } from '../types.js';
import { decycle } from './object/decycle.js';
import { isDefined } from './type-guards.js';

/**
 * create an structured clone of an value using Notification if available, otherwise history state (may alters history)
 *
 * may not work in every environment!
 * @param value value to clone
 * @returns clone of value
 */
export function structuredClone<T>(value: T): T {
  if (supportsNotification) {
    return new Notification('', { data: value, silent: true }).data as T;
  }

  const oldState = history.state;
  history.replaceState(value, document.title);
  const copy = history.state as T;
  history.replaceState(oldState, document.title);

  return copy;
}

/**
 * create an structured clone of an value using a MessageChannel
 *
 * should work in all environments
 * @param value value to clone
 * @returns clone of value
 */
export async function structuredCloneAsync<T>(value: T, options?: { transfer?: any[] }): Promise<T> {
  const { port1, port2 } = new MessageChannel();

  const promise = new Promise<T>((resolve) => (port2.onmessage = (event) => resolve(event.data as T)));
  port1.postMessage(value, options);

  return promise;
}

export function valueOfType<T>(value: T): T {
  return value;
}

export function flatten<T>(array: DeepArray<T>): T[] {
  return array.reduce<T[]>((acc, item) => (Array.isArray(item) ? [...(acc), ...flatten(item)] : [...(acc), item]), []);
}

export function toError(obj: any): Error {
  if (obj instanceof Error) {
    return obj;
  }

  let message: string;

  try {
    message = JSON.stringify(decycle(obj));
  }
  catch {
    message = 'serialization of error reason failed. Take a look at the details property of this error instance.';
  }

  const error = new DetailsError(message, obj);
  return error;
}

export function select<T extends Record, K extends keyof T>(key: K): (item: T) => T[K] {
  return (item: T): any => item[key];
}

export function parseFirstAndFamilyName(name: string): { firstName: string | undefined, familyName: string | undefined } {
  if (name.includes(',')) {
    const [familyName, firstName] = name.split(',').map((part) => part.trim());
    return { firstName, familyName };
  }

  const parts = name.split(' ');
  const familyName = (parts.length > 1) ? (parts.pop()!).trim() : '';
  const firstName = parts.map((part) => part.trim()).join(' ');

  return {
    firstName: firstName.length > 0 ? firstName : undefined,
    familyName: familyName.length > 0 ? familyName : undefined
  };
}

export type NormalizeTextOptions = {
  /**
   * remove leading and trailing whitespace
   */
  trim?: boolean,

  /**
   * lowercase all characters
   */
  lowercase?: boolean,

  /**
   * remove multiple consecutive whitespace characters
   */
  multipleWhitespace?: boolean,

  /**
   * remove diacritics (è -> e)
   *
   * applies unicode NFD normalization and removes diacritics
   * @see unicode option
   */
  diacritics?: boolean,

  /**
   * replace ligatures with their consecutive characters (æ -> ae)
   *
   * applies unicode NFKC normalization
   * @see unicode option
   */
  ligatures?: boolean,

  /**
   * unicode normalization
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/normalize
   */
  unicode?: 'NFC' | 'NFD' | 'NFKC' | 'NFKD'
};

/**
 * trims, lowercases, replaces multi-character whitespace with a single space and unicode normalization
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

export function iif<T, F>(condition: boolean, trueFn: () => T, falseFn: () => F): T | F {
  return condition ? trueFn() : falseFn();
}
