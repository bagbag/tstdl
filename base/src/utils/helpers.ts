import { Enumerable } from '../enumerable';
import { DetailsError } from '../error';
import type { DeepArray, StringMap } from '../types';
import { random } from './math';
import type { Comparator } from './sort';

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

export function now(): Date {
  return new Date();
}

export function currentTimestampSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

export function currentTimestamp(): number {
  return Date.now();
}

export function numericDateToTimestamp(numericDate: number): number {
  return numericDate * 86400000;
}

export function numericDateToDate(numericDate: number): { year: number, month: number, day: number } {
  const timestamp = numericDateToTimestamp(numericDate);
  const date = new Date(timestamp);

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate()
  };
}

export function timestampToNumericDate(timestamp: number): number {
  return Math.floor(timestamp / 86400000);
}

export function dateToNumericDate(date: Date): number {
  const timestamp = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return timestampToNumericDate(timestamp);
}

export function currentDate(): number {
  const timestamp = currentTimestamp();
  return timestampToNumericDate(timestamp);
}

export function clone<T>(object: T, deep: boolean): T {
  const type = typeof object;

  if (type == 'string' || type == 'number' || type == 'boolean' || type == 'undefined' || type == 'function' || object == undefined || object instanceof Date || object instanceof RegExp) {
    return object;
  }

  if (!deep) {
    return { ...object };
  }

  const result: StringMap = {};

  const properties = Object.getOwnPropertyNames(object);
  for (const property of properties) {
    result[property] = clone((object as StringMap)[property] as unknown, true);
  }

  return result as T;
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
  return array.reduce((acc, item) => (Array.isArray(item) ? [...(acc as T[]), ...flatten(item)] : [...(acc as T[]), item]), [] as T[]) as T[];
}

export function toError(obj: any): Error {
  if (obj instanceof Error) {
    return obj;
  }

  let message: string;

  try {
    message = JSON.stringify(obj);
  }
  catch {
    message = 'serialization of error reason failed. Take a look at the details property of this error instance.';
  }

  const error = new DetailsError(message, obj);
  return error;
}

export function formatError(error: Error, includeStack: boolean): string {
  const stackMessage = (includeStack && (error.stack != undefined)) ? `\n${error.stack}` : '';
  return `${error.name}: ${error.message}${stackMessage}`;
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
  const indexMapEntries = order.map((orderItem, index) => [orderItem, index] as [TSelect, number]);
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
  return (a > b) ? 1 : ((b > a) ? -1 : 0);
}

export function compareByValueDescending<T>(a: T, b: T): number {
  return (a > b) ? -1 : ((b > a) ? 1 : 0);
}

export function matchAll(regex: RegExp, text: string): RegExpExecArray[] {
  const matches: RegExpExecArray[] = [];

  let match: RegExpExecArray | null;
  do {
    match = regex.exec(text);

    if (match != undefined) {
      matches.push(match);
    }
  }
  while (match != undefined);

  return matches;
}

type NN<T> = NonNullable<T>;

export interface DotNotator<T> {
  (key: keyof T): DotNotator<T[typeof key]>;
  notate(): string;
}

export function dotNotator<T>(): <K extends keyof T>(key: K) => DotNotator<T[K]> {
  return getDotNotatorWrapper;
}

function getDotNotatorWrapper<T, K extends keyof T>(key: K): DotNotator<T[K]> {
  return getDotNotator(key as string);
}

function getDotNotator<T, K extends keyof T>(...keys: (string | number)[]): DotNotator<T[K]> {
  const dotNotatorChild: DotNotator<T[K]> = (key: keyof T[K]) => getDotNotator(...keys, key as string);
  dotNotatorChild.notate = () => {
    for (const key of keys) {
      if (typeof key == 'symbol') {
        throw new Error('symbol not supported');
      }
    }

    return keys.join('.');
  };

  return dotNotatorChild;
}

export function dotNotation<T>(
  k1: keyof T,
  k2?: keyof T[typeof k1],
  k3?: keyof T[NN<typeof k1>][NN<typeof k2>],
  k4?: keyof T[NN<typeof k1>][NN<typeof k2>][NN<typeof k3>],
  k5?: keyof T[NN<typeof k1>][NN<typeof k2>][NN<typeof k3>][NN<typeof k4>],
  k6?: keyof T[NN<typeof k1>][NN<typeof k2>][NN<typeof k3>][NN<typeof k4>][NN<typeof k5>],
  k7?: keyof T[NN<typeof k1>][NN<typeof k2>][NN<typeof k3>][NN<typeof k4>][NN<typeof k5>][NN<typeof k6>],
  k8?: keyof T[NN<typeof k1>][NN<typeof k2>][NN<typeof k3>][NN<typeof k4>][NN<typeof k5>][NN<typeof k6>][NN<typeof k7>],
  k9?: keyof T[NN<typeof k1>][NN<typeof k2>][NN<typeof k3>][NN<typeof k4>][NN<typeof k5>][NN<typeof k6>][NN<typeof k7>][NN<typeof k8>]
): string;
export function dotNotation(...keys: any[]): string {
  for (const key of keys) {
    if (typeof key == 'symbol') {
      throw new Error('symbol not supported');
    }
  }

  return keys.filter((key) => key != undefined).join('.');
}

export function createArray<T>(length: number, valueProvider: (index: number) => T): T[] {
  const array = new Array<T>(length);

  for (let i = 0; i < length; i++) {
    array[i] = valueProvider(i);
  }

  return array;
}

export function randomElement<T>(array: T[], { min, max }: { min?: number, max?: number } = {}): T {
  const _min = min != undefined ? Math.max(min, 0) : 0;
  const _max = max != undefined ? Math.min(max, array.length - 1) : array.length - 1;
  const index = random(_min, _max, true);

  return array[index];
}

const defaultComparator = (a: unknown, b: unknown): boolean => a == b;

type ArrayEqualsComparator<A, B> = (a: A, b: B) => boolean;

type ArrayEqualsOptions<A, B> = {
  sort?: Comparator<A | B>,
  comparator?: ArrayEqualsComparator<A, B>
};

export function arrayEquals<A, B>(a: A[], b: B[], options?: ArrayEqualsOptions<A, B>): boolean {
  const sort = options?.sort ?? false;
  const comparator = options?.comparator ?? defaultComparator;

  if (a.length != b.length) {
    return false;
  }

  const c = sort != false ? Enumerable.from(a).sort(sort).toArray() : a;
  const d = sort != false ? Enumerable.from(b).sort(sort).toArray() : b;

  for (let i = 0; i < c.length; i++) {
    const equals = comparator(c[i], d[i]);

    if (!equals) {
      return false;
    }
  }

  return true;
}

type EqualsOptions = {
  deep?: boolean,
  arrayDeep?: boolean,
  sortArray?: boolean
};

// eslint-disable-next-line max-statements, max-lines-per-function
export function equals(a: any, b: any, options: EqualsOptions = {}): boolean {
  if (a === b) {
    return true;
  }

  const aType = typeof a;
  const bType = typeof b;

  if (aType != bType) {
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

      const aPrototype = Object.getPrototypeOf(a);
      const bPrototype = Object.getPrototypeOf(b);

      if (aPrototype != bPrototype) {
        return false;
      }

      if (Array.isArray(a)) {
        return (options.arrayDeep != false && (options.deep == true || options.arrayDeep == true))
          ? arrayEquals(a, b as any[], { sort: (options.sortArray == true) ? compareByValue : undefined, comparator: (x, y) => equals(x, y, options) })
          : a === b;
      }

      if (aPrototype != Object.prototype && aPrototype !== null) {
        throw new Error('equals only supports plain objects, arrays and primitives');
      }

      return objectEquals(a, b, options);

    default:
      return a === b;
  }
}

// eslint-disable-next-line max-statements, max-lines-per-function
function objectEquals(a: Record<string, unknown>, b: Record<string, unknown>, options: EqualsOptions): boolean {
  const aProperties = Object.getOwnPropertyNames(a);
  const bProperties = Object.getOwnPropertyNames(b);

  if (!arrayEquals(aProperties, bProperties, { sort: compareByValue })) {
    return false;
  }

  for (const property of aProperties) {
    const eq = equals(a[property], b[property], options);

    if (!eq) {
      return false;
    }
  }

  return true;
}
