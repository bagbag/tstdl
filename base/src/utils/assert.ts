/* eslint-disable @typescript-eslint/restrict-template-expressions */
import { AssertionError } from '../error';

export function assert(condition: boolean, message: string = 'assertion failed'): asserts condition {
  if (!condition) {
    throw new AssertionError(message);
  }
}

export function assertUndefined<T>(value: T | undefined, message: string = `Expected value to be undefined, but it is ${value}`): asserts value is undefined {
  return assert(value == undefined, message);
}

export function assertDefined<T>(value: T, message: string = `Expected value to be defined, but it is ${value}`): asserts value is NonNullable<T> {
  return assert(value != undefined, message);
}

export function assertString(value: any, message: string = `Expected value to be string, but it is ${value}`): asserts value is string {
  return assert(typeof value == 'string', message);
}

export function assertNumber(value: any, message: string = `Expected value to be number, but it is ${value}`): asserts value is number {
  return assert(typeof value == 'number', message);
}

export function assertBoolean(value: any, message: string = `Expected value to be boolean, but it is ${value}`): asserts value is boolean {
  return assert(typeof value == 'boolean', message);
}
