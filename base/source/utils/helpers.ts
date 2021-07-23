/* eslint-disable @typescript-eslint/ban-types */

import { DetailsError } from '../error';
import type { BinaryData, DeepArray, StringMap, TypedArray } from '../types';
import { currentTimestamp } from './date-time';
import { sort } from './iterable-helpers';
import { random } from './math';
import type { Comparator } from './sort';
import { assertString, assertStringPass, isArray, isArrayBuffer, isDate, isDefined, isFunction, isNotNull, isNullOrUndefined, isObject, isPrimitive, isRegExp, isString, isUndefined } from './type-guards';

export function getGetter<T extends object, U extends keyof T>(obj: T, property: keyof T, bind: boolean): () => T[U] {
  if (!(property in obj)) {
    throw new Error(`property ${property as string} does not exist`);
  }

  let objOrPrototype = obj as object;

  while (!Object.prototype.hasOwnProperty.call(objOrPrototype, property)) {
    objOrPrototype = Object.getPrototypeOf(objOrPrototype) as object;
  }

  const descriptor = Object.getOwnPropertyDescriptor(objOrPrototype, property);

  if (descriptor == undefined) {
    throw new Error('could not get property descriptor');
  }

  if (descriptor.get == undefined) {
    throw new Error(`property ${property as string} has no getter`);
  }

  // eslint-disable-next-line @typescript-eslint/unbound-method
  const getter = bind ? descriptor.get.bind(obj) : descriptor.get;
  return getter;
}

export function toArray<T>(value: T | T[]): T[] {
  return Array.isArray(value)
    ? value
    : [value];
}

export function clone<T>(object: T, deep: boolean): T {
  if (isPrimitive(object) || isNullOrUndefined(object) || isDate(object) || isRegExp(object)) {
    return object;
  }

  if (!deep) {
    return (isArray(object) ? [...object] : { ...object }) as T;
  }

  if (isArray(object)) {
    return object.map((value): any => clone(value, true)) as any as T;
  }

  return Object.fromEntries(Object.entries(object).map(([key, value]) => [key, clone(value, true)] as const)) as T;
}

type DidNotRun = symbol;
export const didNotRun: DidNotRun = Symbol('did-not-run');

export function throttleFunction<Args extends any[], ReturnValue>(func: (...args: Args) => ReturnValue, interval: number, queue: boolean = false): (...args: Args) => (ReturnValue | DidNotRun) {
  let lastCall = 0;
  let pending = false;
  let nextArgs: Args;

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  const throttled = (...args: Args) => {
    const nextAllowedCall = lastCall + interval;
    const now = currentTimestamp(); // eslint-disable-line no-shadow

    if (now >= nextAllowedCall) {
      pending = false;
      lastCall = now;
      return func(...args);
    }
    else if (queue) {
      nextArgs = args;

      if (!pending) {
        const delay = nextAllowedCall - now;
        setTimeout(() => throttled(...nextArgs), delay);
        pending = true;
      }
    }

    return didNotRun;
  };

  return throttled;
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
  includeRest?: boolean,
  includeStack?: boolean
};

// eslint-disable-next-line max-statements
export function formatError(error: any, options: FormatErrorOptions = {}): string {
  const { includeRest = false, includeStack = false } = options;

  let name: string | undefined;
  let message: string | undefined;
  let stack: string | undefined;
  let rest: StringMap | undefined;

  if (error instanceof Error) {
    ({ name, message, stack, ...rest } = error);
  }
  /* eslint-disable @typescript-eslint/no-unsafe-member-access */
  else if (error?.rejection instanceof Error) {
    return formatError(error.rejection, options);
  }
  else if (error?.reason instanceof Error) {
    return formatError(error.reason, options);
  }
  else if (error?.error instanceof Error) {
    return formatError(error.error, options);
  }
  /* eslint-enable @typescript-eslint/no-unsafe-member-access */

  if (isUndefined(name) && (isUndefined(message) || message.trim().length == 0)) {
    try {
      message = JSON.stringify(decycle(error), null, 2);
    }
    catch (stringifyError: unknown) {
      throw error;
    }
  }

  const stackString = (includeStack && isDefined(stack)) ? `\n${stack}` : '';
  const restString = (includeRest && (Object.keys(rest ?? {}).length > 0)) ? `\n${JSON.stringify(decycle(rest), null, 2)}` : '';

  return `${name ?? 'Error'}: ${message}${restString}${stackString}`;
}

export function compareByValueSelection<T>(...selectors: ((item: T) => unknown)[]): (a: T, b: T) => number {
  return (a: T, b: T) => {
    for (const selector of selectors) {
      const selectedA = selector(a);
      const selectedB = selector(b);
      const comparison = compareByValue(selectedA, selectedB);

      if (comparison != 0) {
        return comparison;
      }
    }

    return 0;
  };
}

export function compareByValueSelectionDescending<T>(...selectors: ((item: T) => unknown)[]): (a: T, b: T) => number {
  return (a: T, b: T) => {
    for (const selector of selectors) {
      const selectedA = selector(a);
      const selectedB = selector(b);
      const comparison = compareByValueDescending(selectedA, selectedB);

      if (comparison != 0) {
        return comparison;
      }
    }

    return 0;
  };
}

export function compareByValueSelectionOrdered<T>(...selectors: [(item: T) => unknown, 1 | -1][]): (a: T, b: T) => number {
  return (a: T, b: T) => {
    for (const [selector, order] of selectors) {
      const selectedA = selector(a);
      const selectedB = selector(b);
      const comparison = (order == 1)
        ? compareByValue(selectedA, selectedB)
        : compareByValueDescending(selectedA, selectedB);

      if (comparison != 0) {
        return comparison;
      }
    }

    return 0;
  };
}

export function compareByValueToOrder<T>(order: T[]): (a: T, b: T) => number {
  return compareByValueSelectionToOrder(order, (item) => item);
}

export function compareByValueSelectionToOrder<T, TSelect>(order: TSelect[], selector: (item: T) => TSelect): (a: T, b: T) => number {
  const indexMapEntries = order.map((orderItem, index) => [orderItem, index] as const);
  const indexMap = new Map(indexMapEntries);

  // eslint-disable-next-line @typescript-eslint/no-shadow
  return function compareByValueSelectionToOrder(a: T, b: T): number {
    const selectedA = selector(a);
    const selectedB = selector(b);
    const indexA = indexMap.get(selectedA);
    const indexB = indexMap.get(selectedB);

    if (indexA == undefined || indexB == undefined) {
      throw new Error('value not defined in order');
    }

    return compareByValue(indexA, indexB);
  };
}

export function compareByValue<T>(a: T, b: T): number {
  if (a === b) {
    return 0;
  }
  else if (a > b) {
    return 1;
  }
  else if (b > a) {
    return -1;
  }

  throw new Error('objects not comparable');
}

export function compareByValueDescending<T>(a: T, b: T): number {
  if (a === b) {
    return 0;
  }
  else if (a > b) {
    return -1;
  }
  else if (b > a) {
    return 1;
  }

  throw new Error('objects not comparable');
}

export function propertyNameOf<T extends object>(expression: (instance: T) => any, { deep = true, flattenArray = false }: { deep?: boolean, flattenArray?: boolean } = {}): string {
  let name: string | undefined;

  const { proxy, revoke } = Proxy.revocable<T>({} as T, {
    get: (_target, property): any => {
      assertString(property, `property must be a string, but was ${property.toString()}`);

      const ignore = (flattenArray && (/\d+/u).test(property));

      if (ignore) {
        return proxy;
      }

      if (deep) {
        name = isUndefined(name) ? property : `${name}.${property}`;
      }
      else {
        name = property;
      }

      return proxy;
    }
  });

  expression(proxy);
  revoke();

  return assertStringPass(name, 'invalid expression');
}

export function createArray<T>(length: number, valueProvider: (index: number) => T): T[] {
  const array = [];

  for (let i = 0; i < length; i++) {
    array.push(valueProvider(i));
  }

  return array;
}

export function randomElement<T>(array: T[], { min, max }: { min?: number, max?: number } = {}): T {
  const _min = min != undefined ? Math.max(min, 0) : 0;
  const _max = max != undefined ? Math.min(max, array.length - 1) : array.length - 1;
  const index = random(_min, _max, true);

  return array[index]!;
}

const defaultArrayEqualsComparator = (a: unknown, b: unknown): boolean => a === b;

type ArrayEqualsComparator<A, B> = (a: A, b: B) => boolean;

type ArrayEqualsOptions<A, B> = {
  sort?: Comparator<A | B>,
  comparator?: ArrayEqualsComparator<A, B>
};

export function arrayEquals<A, B>(a: A[], b: B[], options?: ArrayEqualsOptions<A, B>): boolean {
  const _sort = options?.sort ?? false;
  const comparator = options?.comparator ?? defaultArrayEqualsComparator;

  if (a.length != b.length) {
    return false;
  }

  const c = _sort != false ? toArray(sort(a, _sort)) : a;
  const d = _sort != false ? toArray(sort(b, _sort)) : b;

  for (let i = 0; i < c.length; i++) {
    const itemEquals = comparator(c[i]!, d[i]!);

    if (!itemEquals) {
      return false;
    }
  }

  return true;
}

export type EqualsOptions = {
  deep?: boolean,
  arrayDeep?: boolean,
  sortArray?: boolean,
  coerceStrings?: boolean
};

const allowedEqualsCoerceStringsTypes = ['string', 'number', 'boolean', 'bigint'];

export function equals(a: any, b: any, options?: EqualsOptions): boolean;
export function equals(a: any, b: any, options?: EqualsOptions, __doNotUse?: any): boolean; // eslint-disable-line @typescript-eslint/unified-signatures
export function equals(a: any, b: any, options: EqualsOptions = {}, visitedNodes: Set<any> = new Set()): boolean { // eslint-disable-line max-statements, complexity, max-lines-per-function
  if (a === b) {
    return true;
  }

  const aType = typeof a;
  const bType = typeof b;

  if (aType != bType) {
    if (isDefined(options.coerceStrings) && allowedEqualsCoerceStringsTypes.includes(aType) && allowedEqualsCoerceStringsTypes.includes(bType)) {
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      return (a as object).toString() == (b as object).toString();
    }

    return false;
  }

  switch (aType) {
    case 'function':
      return (options.deep == true)
        ? (a as Function).toString() == (b as Function).toString()
        : false; // eslint-disable-line @typescript-eslint/ban-types

    case 'object':
      if (a === null || b === null) { // hasn't passed equals check at top, so one must be a true object
        return false;
      }

      if (visitedNodes.has(a)) {
        return true;
      }

      visitedNodes.add(a);

      const aPrototype = Object.getPrototypeOf(a);
      const bPrototype = Object.getPrototypeOf(b);

      if (aPrototype !== bPrototype) {
        return false;
      }

      if (Array.isArray(a)) {
        return (options.arrayDeep != false && (options.deep == true || options.arrayDeep == true))
          ? arrayEquals(a, b as any[], { sort: (options.sortArray == true) ? compareByValue : undefined, comparator: (x, y) => equals(x, y, options, visitedNodes) })
          : a === b;
      }

      if (aPrototype != Object.prototype && aPrototype !== null) { // checking a is enough, because b must have equal prototype (checked above)
        throw new Error('equals only supports plain objects, arrays and primitives');
      }

      if (options.deep == false) {
        return false;
      }

      return objectEquals(a as Record<any, any>, b as Record<any, any>, options, visitedNodes);

    default:
      return a === b;
  }
}

// eslint-disable-next-line max-statements, max-lines-per-function
function objectEquals(a: Record<string, unknown>, b: Record<string, unknown>, options: EqualsOptions, visitedNodes: Set<any>): boolean {
  const aProperties = Object.getOwnPropertyNames(a);
  const bProperties = Object.getOwnPropertyNames(b);

  if (!arrayEquals(aProperties, bProperties, { sort: compareByValue })) {
    return false;
  }

  for (const property of aProperties) {
    const eq = equals(a[property], b[property], options, visitedNodes);

    if (!eq) {
      return false;
    }
  }

  return true;
}

/**
 * compares to binary types for equal content
 */
export function binaryEquals(bufferA: BinaryData, bufferB: BinaryData): boolean {
  const a = toUint8Array(bufferA, false);
  const b = toUint8Array(bufferB, false);

  if (a.length != b.length) {
    return false;
  }

  for (let i = 0; i < a.length; i++) {
    if (a[i] != b[i]) {
      return false;
    }
  }

  return true;
}

/**
 * eslint-disable-next-line @typescript-eslint/no-shadow
 * convert to Uint8Array
 * @param data binary data
 * @param clone whether to clone buffer or not
 */
export function toUint8Array(data: BinaryData, clone: boolean = false): Uint8Array { // eslint-disable-line @typescript-eslint/no-shadow
  if (isArrayBuffer(data)) {
    return clone ? new Uint8Array(data.slice(0)) : new Uint8Array(data);
  }
  const { buffer, byteOffset, byteLength } = (data as TypedArray | DataView);

  return clone
    ? new Uint8Array(buffer.slice(byteOffset, byteLength))
    : new Uint8Array(buffer, byteOffset, byteLength);
}

export function stripPropertyWhen<T extends object, S>(obj: T, predicate: (value: unknown) => value is S): { [P in keyof T]: T[P] extends S ? T[P] | undefined : T[P] } {
  const filtered = Object.entries(obj).filter(([, value]) => !predicate(value));
  return Object.fromEntries(filtered) as { [P in keyof T]: T[P] extends S ? T[P] | undefined : T[P] };
}

export function stripPropertyWhenUndefined<T extends object>(obj: T): { [P in keyof T]: T[P] extends undefined ? T[P] | undefined : T[P] } {
  return stripPropertyWhen(obj, (value): value is undefined => value === undefined);
}

export function stripPropertyWhenNull<T extends object>(obj: T): { [P in keyof T]: T[P] extends null ? T[P] | undefined : T[P] } {
  return stripPropertyWhen(obj, (value): value is null => value === null);
}

export function stripPropertyWhenNullOrUndefined<T extends object>(obj: T): { [P in keyof T]: T[P] extends undefined | null ? T[P] | undefined : T[P] } {
  return stripPropertyWhen(obj, (value): value is undefined | null => value == undefined);
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
  const mapping = new Map();

  function _decycle(__value: any, path: string): any {
    const value = isDefined(replacer) ? replacer(__value) : __value;

    if (isPrimitive(value) || isRegExp(value) || isDate(value) || isFunction(value)) {
      return value;
    }

    const mappedPath = mapping.get(value as object);

    if (isDefined(mappedPath)) {
      return { $ref: mappedPath };
    }

    mapping.set(value as object, path);

    if (isArray(value)) {
      return value.map((item, index): any => _decycle(item, `${path}[${index}]`)) as any;
    }

    return Object.fromEntries(Object.entries(value as StringMap).map(([key, item]) => [key, _decycle(item, `${path}['${key}']`)] as const));
  }

  return _decycle(_value, '$') as Decycled<T>;
}

const pathPattern = /^\$(?:\[(?:(\d+)|'(.*?)')\])*$/u;
const pathPartsPattern = /\[(?:(\d+)|'(.*?)')\]/ug;

/**
 * replaces JSONPath in objects with their reference
 * @param value object to recycle
 */

export function recycle<T = any>(value: Decycled<T>, clone?: boolean): T; // eslint-disable-line @typescript-eslint/no-shadow
export function recycle<T = any>(value: any, clone?: boolean): T; // eslint-disable-line @typescript-eslint/no-shadow, @typescript-eslint/unified-signatures
export function recycle<T = any>(_value: Decycled<T>, _clone: boolean = true): T { // eslint-disable-line max-lines-per-function
  const value = _clone ? clone(_value, true) : _value;

  function deref(ref: string): any {
    const parts = ref.matchAll(pathPartsPattern);

    let target = value;
    for (const [, index, property] of parts) {
      const key = index ?? property;

      if (!Object.prototype.hasOwnProperty.call(target, key!)) {
        throw new Error(`reference ${ref} not found`);
      }

      target = (target as StringMap)[key!];
    }

    return target;
  }

  function getRef(node: any): string | undefined {
    if (isObject(node) && Object.prototype.hasOwnProperty.call(node, '$ref')) {
      const ref = (node as StringMap)['$ref'];

      if (isString(ref) && pathPattern.test(ref)) {
        return ref;
      }
    }

    return undefined;
  }

  function _recycle(node: any): void {
    if (isArray(node)) {
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
