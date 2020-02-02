import { DeepArray, StringMap } from '../types';
import { random } from './math';

export function getGetter<T extends object, U extends keyof T>(obj: T, property: keyof T, bind: boolean): () => T[U] {
  if (!(property in obj)) {
    throw new Error(`property ${property} does not exist`);
  }

  let objOrPrototype = obj as object;

  while (!objOrPrototype.hasOwnProperty(property)) {
    objOrPrototype = Object.getPrototypeOf(objOrPrototype) as object;
  }

  const descriptor = Object.getOwnPropertyDescriptor(objOrPrototype, property);

  if (descriptor == undefined) {
    throw new Error('could not get property descriptor');
  }

  if (descriptor.get == undefined) {
    throw new Error(`property ${property} has no getter`);
  }

  // tslint:disable-next-line: no-unbound-method
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
    result[property] = clone((object as any)[property] as unknown, true);
  }

  return result as T;
}

export function throttleFunction(func: () => void, interval: number): () => void;
export function throttleFunction<T>(func: (arg: T) => void, interval: number): (arg: T) => void;
export function throttleFunction<T1, T2>(func: (arg1: T1, arg2: T2) => void, interval: number): (arg1: T1, arg2: T2) => void;
export function throttleFunction<T1, T2, T3>(func: (arg1: T1, arg2: T2, arg3: T3) => void, interval: number): (arg1: T1, arg2: T2, arg3: T3) => void;
export function throttleFunction<T1, T2, T3, T4>(func: (arg1: T1, arg2: T2, arg3: T3, arg4: T4) => void, interval: number): (arg1: T1, arg2: T2, arg3: T3, arg4: T4) => void;
export function throttleFunction(func: (...args: any[]) => void, interval: number): (...args: any[]) => void {
  let lastCall = 0;
  let nextArguments: any[];
  let callPending = false;

  const throttled = (...args: any[]) => {
    nextArguments = args;

    const nextAllowedCall = lastCall + interval;
    const now = Date.now();

    if (now >= nextAllowedCall) {
      lastCall = now;
      func(...nextArguments);
      callPending = false;
    } else if (!callPending) {
      const delay = nextAllowedCall - now;
      setTimeout(() => throttled(...nextArguments), delay);
      callPending = true;
    }
  };

  return throttled;
}

export function formatDuration(milliseconds: number, precision: number): string {
  let value: number;
  let suffix: string;

  if (milliseconds >= (10 ** 3)) {
    value = milliseconds / (10 ** 3);
    suffix = 's';
  } else if (milliseconds >= 1) {
    value = milliseconds;
    suffix = 'ms';
  } else if (milliseconds >= 1 / (10 ** 3)) {
    value = milliseconds * (10 ** 3);
    suffix = 'us';
  } else {
    value = milliseconds * (10 ** 6);
    suffix = 'ns';
  }

  const trimmed = parseFloat(value.toFixed(precision));
  const result = `${trimmed} ${suffix}`;

  return result;
}

export function flatten<T>(array: DeepArray<T>): T[] {
  return (array as any[]).reduce((acc, item) => Array.isArray(item) ? [...acc, ...flatten(item)] : [...acc, item], [] as T[]);
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
    message = 'serialization of error reason failed. Take a look at the data property of this error instance.';
  }

  const error = new Error(message);
  (error as any).data = obj;

  return error;
}

export function formatError(error: Error, includeStack: boolean): string {
  const stackMessage = (includeStack && (error.stack != undefined)) ? `\n${error.stack}` : '';
  return `${error.name}: ${error.message}${stackMessage}`;
}

export function compareByValueSelection<T, U>(selector: (item: T) => U): (a: T, b: T) => number {
  return (a: T, b: T) => {
    const selectedA = selector(a);
    const selectedB = selector(b);

    return compareByValue(selectedA, selectedB);
  };
}

export function compareByValueSelectionDescending<T, U>(selector: (item: T) => U): (a: T, b: T) => number {
  return (a: T, b: T) => {
    const selectedA = selector(a);
    const selectedB = selector(b);

    return compareByValueDescending(selectedA, selectedB);
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

export function dotNotation<T, Key1 extends keyof NonNullable<T>>(typeInferHelper: T, key1: Key1): string;
export function dotNotation<T, Key1 extends keyof NonNullable<T>, Key2 extends keyof NonNullable<NonNullable<T>[Key1]>>(typeInferHelper: T, key1: Key1, key2: Key2): string;
export function dotNotation<T, Key1 extends keyof NonNullable<T>, Key2 extends keyof NonNullable<NonNullable<T>[Key1]>, Key3 extends keyof NonNullable<NonNullable<NonNullable<T>[Key1]>[Key2]>>(typeInferHelper: T, key1: Key1, key2: Key2, key3: Key3): string;
export function dotNotation<T, Key1 extends keyof NonNullable<T>, Key2 extends keyof NonNullable<NonNullable<T>[Key1]>, Key3 extends keyof NonNullable<NonNullable<NonNullable<T>[Key1]>[Key2]>, Key4 extends keyof NonNullable<NonNullable<NonNullable<NonNullable<T>[Key1]>[Key2]>[Key3]>>(typeInferHelper: T, key1: Key1, key2: Key2, key3: Key3, key4: Key4): string;
export function dotNotation<T, Key1 extends keyof NonNullable<T>, Key2 extends keyof NonNullable<NonNullable<T>[Key1]>, Key3 extends keyof NonNullable<NonNullable<NonNullable<T>[Key1]>[Key2]>, Key4 extends keyof NonNullable<NonNullable<NonNullable<NonNullable<T>[Key1]>[Key2]>[Key3]>, Key5 extends keyof NonNullable<NonNullable<NonNullable<NonNullable<NonNullable<T>[Key1]>[Key2]>[Key3]>[Key4]>>(typeInferHelper: T, key1: Key1, key2: Key2, key3: Key3, key4: Key4, key5: Key5): string;
export function dotNotation(_type: any, ...keys: string[]): string {
  for (const key of keys) {
    if (typeof key == 'symbol') {
      throw new Error('symbol not supported');
    }
  }

  return keys.join('.');
}

export function createArray<T>(length: number, valueProvider: (index: number) => T): T[] {
  const array = new Array(length);

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
