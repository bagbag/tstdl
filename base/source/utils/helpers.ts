/* eslint-disable @typescript-eslint/ban-types */

import { HttpError } from '#/http/http.error';
import { DetailsError } from '../error';
import type { DeepArray, Record, StringMap } from '../types';
import { hasOwnProperty, mapObjectValues, objectEntries } from './object/object';
import { assertObject, isArray, isArrayBuffer, isDataView, isDate, isDefined, isFunction, isMap, isNotNull, isObject, isPrimitive, isRegExp, isSet, isString, isTypedArray, isUndefined, isWritableArray } from './type-guards';

const supportsNotification = typeof Notification != 'undefined';

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

// eslint-disable-next-line max-statements
export function clone<T>(object: T, deep: boolean): T {
  if (isPrimitive(object)) {
    return object;
  }

  if (isDate(object)) {
    return new Date(object) as unknown as T;
  }

  if (isRegExp(object)) {
    return new RegExp(object.source, object.flags) as unknown as T;
  }

  if (isSet(object)) {
    return new Set(object) as unknown as T;
  }

  if (isMap(object)) {
    return new Map(object) as unknown as T;
  }

  if (isArrayBuffer(object)) {
    return object.slice(0) as unknown as T;
  }

  if (isTypedArray(object)) {
    return object.slice() as unknown as T;
  }

  if (isDataView(object)) {
    const clonedBuffer = object.buffer.slice(0);
    return new DataView(clonedBuffer, object.byteOffset, object.byteLength) as unknown as T;
  }

  if (isArray(object)) {
    return deep
      ? object.map((value): any => clone(value, true)) as any as T
      : [...object] as unknown as T;
  }

  assertObject(object);

  if (!deep) {
    return { ...object } as T;
  }

  const entries = objectEntries(object).map(([key, value]) => [key, clone(value, true)] as const);
  return Object.fromEntries(entries) as unknown as T;
}

export function formatDuration(milliseconds: number, precision: number): string {
  let value: number;
  let suffix: string;

  if (milliseconds >= (10 ** 3)) {
    value = milliseconds / (10 ** 3);
    suffix = 's';
  }
  else if (milliseconds >= 1) {
    value = milliseconds;
    suffix = 'ms';
  }
  else if (milliseconds >= 1 / (10 ** 3)) {
    value = milliseconds * (10 ** 3);
    suffix = 'us';
  }
  else {
    value = milliseconds * (10 ** 6);
    suffix = 'ns';
  }

  const trimmed = parseFloat(value.toFixed(precision));
  const result = `${trimmed} ${suffix}`;

  return result;
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

export type FormatErrorOptions = {
  /**
   * include all error properties beside name and message
   */
  includeRest?: boolean,

  /**
   * include stack trace
   */
  includeStack?: boolean,

  /**
   * enable special formatting for some known Errors like {@link HttpError} in certain configurations
   */
  handleBuiltInErrors?: boolean
};

// eslint-disable-next-line max-statements, complexity
export function formatError(error: any, options: FormatErrorOptions = {}): string {
  const { includeRest = true, includeStack = true, handleBuiltInErrors = true } = options;

  let name: string | undefined;
  let message: string | undefined;
  let stack: string | undefined;
  let rest: StringMap | undefined;
  let extraInfo: StringMap | undefined;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const wrappedError = error?.rejection ?? error?.reason ?? error?.error;

  if ((error instanceof Error) && !(error.message.startsWith('Uncaught') && (wrappedError instanceof Error))) {
    ({ name, message, stack, ...rest } = error);

    if (handleBuiltInErrors) {
      if ((error instanceof HttpError) && !includeRest) {
        extraInfo = {
          url: error.request.url,
          method: error.request.method
        };
      }
    }
  }
  else if (wrappedError instanceof Error) {
    return formatError(wrappedError, options);
  }

  if (isUndefined(name) && (isUndefined(message) || message.trim().length == 0)) {
    try {
      message = JSON.stringify(decycle(error), null, 2);
    }
    catch {
      throw error;
    }
  }

  const restString = (includeRest && (Object.keys(rest ?? {}).length > 0)) ? `\n${JSON.stringify(decycle(rest), null, 2)}` : '';
  const extraInfoString = isDefined(extraInfo) ? `\n${JSON.stringify(extraInfo, null, 2)}` : '';
  const stackString = (includeStack && isDefined(stack)) ? `\n${stack}` : '';

  return `${name ?? 'Error'}: ${message}${restString}${extraInfoString}${stackString}`;
}

export function select<T extends Record, K extends keyof T>(key: K): (item: T) => T[K] {
  return (item: T) => item[key];
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

export function _throw(value: any): never {
  throw value;
}

export function deferThrow(value: any): () => never {
  // eslint-disable-next-line @typescript-eslint/no-shadow
  return function deferThrow() {
    throw value;
  };
}

export type Decycled<T> = { __type: T } & StringMap;

/**
 * replaces cycles (circular references) in objects with JSONPath
 * @param value object to decycle
 * @param replacer replace values. Like JSON.stringify(value, *replacer*)
 */
export function decycle<T>(value: T, replacer?: (value: any) => any): Decycled<T>;
export function decycle<T>(_value: T, replacer?: (value: any) => any): Decycled<T> {
  const mapping = new Map<any, string>();

  const replacerFn = isDefined(replacer) ? replacer : (value: unknown) => value;

  function _decycle(__value: any, path: string): any {
    const value = replacerFn(__value);

    if (isPrimitive(value) || isRegExp(value) || isDate(value) || isFunction(value)) {
      return value;
    }

    const mappedPath = mapping.get(value);

    if (isDefined(mappedPath)) {
      return { $ref: mappedPath };
    }

    mapping.set(value, path);

    if (isArray(value)) {
      return value.map((item, index): any => _decycle(item, `${path}[${index}]`)) as any;
    }

    return mapObjectValues(value, ([key, item]) => [key, _decycle(item, `${path}['${key as string}']`)] as const);
  }

  return _decycle(_value, '$') as Decycled<T>;
}

const recyclePathPattern = /^\$(?:\[(?:(\d+)|'(.*?)')\])*$/u;
const recyclePathPartsPattern = /\[(?:(\d+)|'(.*?)')\]/ug;

/**
 * replaces JSONPath in objects with their reference
 * @param value object to recycle
 */
export function recycle<T = any>(value: Decycled<T>, clone?: boolean): T; // eslint-disable-line @typescript-eslint/no-shadow
export function recycle<T = any>(value: any, clone?: boolean): T; // eslint-disable-line @typescript-eslint/no-shadow, @typescript-eslint/unified-signatures
export function recycle<T = any>(_value: Decycled<T>, _clone: boolean = true): T { // eslint-disable-line max-lines-per-function
  const value = _clone ? clone(_value, true) : _value;

  function deref(ref: string): any {
    const parts = ref.matchAll(recyclePathPartsPattern);

    let target = value;
    for (const [, index, property] of parts) {
      const key = index ?? property;

      if (!hasOwnProperty(target, key!)) {
        throw new Error(`reference ${ref} not found`);
      }

      target = (target as StringMap)[key!];
    }

    return target;
  }

  function getRef(node: any): string | undefined {
    if (isObject(node) && hasOwnProperty<Record>(node, '$ref')) {
      const ref = (node as StringMap)['$ref'];

      if (isString(ref) && recyclePathPattern.test(ref)) {
        return ref;
      }
    }

    return undefined;
  }

  function _recycle(node: any): void {
    if (isWritableArray(node)) {
      for (let i = 0; i < node.length; i++) {
        const ref = getRef(node[i]);

        if (isDefined(ref)) {
          node[i] = deref(ref);
        }
        else {
          _recycle(node[i]);
        }
      }
    }
    else if (isObject(node) && isNotNull(node)) {
      for (const key of Object.keys(node)) {
        const ref = getRef((node as StringMap)[key]);

        if (isDefined(ref)) {
          (node as StringMap)[key] = deref(ref);
        }
        else {
          _recycle((node as StringMap)[key]);
        }
      }
    }
  }

  _recycle(value);
  return value as any as T;
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
