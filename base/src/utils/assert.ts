/* eslint-disable @typescript-eslint/restrict-template-expressions */
import { AssertionError } from '../error';

export function assert(condition: boolean, message: string = 'assertion failed'): asserts condition {
  if (!condition) {
    throw new AssertionError(message);
  }
}

export function assertDefined<T>(value: T, message: string = `Expected value to be defined, but received ${value}`): asserts value is NonNullable<T> {
  return assert(value != undefined, message);
}

export function assertString(value: any, message: string = `Expected value to be string, but received ${value}`): asserts value is string {
  return assert(typeof value == 'string', message);
}

export function assertNumber(value: any, message: string = `Expected value to be number, but received ${value}`): asserts value is number {
  return assert(typeof value == 'number', message);
}

export function assertBoolean(value: any, message: string = `Expected value to be boolean, but received ${value}`): asserts value is boolean {
  return assert(typeof value == 'boolean', message);
}
