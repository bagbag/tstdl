/* eslint-disable @typescript-eslint/restrict-template-expressions */
import { AssertionError } from '../error';

export function assert(condition: boolean, message: string = 'assertion failed'): asserts condition {
  if (!condition) {
    throw new AssertionError(message);
  }
}

export function assertUndefined<T>(value: T | undefined, message: string = `Expected value to be undefined, but it is ${typeof value}`): asserts value is undefined {
  assert(value == undefined, message);
}

export function assertDefined<T>(value: T, message: string = `Expected value to be defined, but it is ${value}`): asserts value is NonNullable<T> {
  assert(value != undefined, message);
}

export function assertString(value: any, message: string = `Expected type of value to be string, but it is ${typeof value}`): asserts value is string {
  assert(typeof value == 'string', message);
}

export function assertNumber(value: any, message: string = `Expected type of value to be number, but it is ${typeof value}`): asserts value is number {
  assert(typeof value == 'number', message);
}

export function assertBoolean(value: any, message: string = `Expected type of value to be boolean, but it is ${typeof value}`): asserts value is boolean {
  assert(typeof value == 'boolean', message);
}

export function assertFunction(value: any, message: string = `Expected type of value to be function, but it is ${typeof value}`): asserts value is Function { // eslint-disable-line @typescript-eslint/ban-types
  assert(typeof value == 'function', message);
}

export function assertPass<T, TPass extends T>(value: T, condition: (value: T) => value is TPass, message?: string): TPass {
  assert(condition(value), message);
  return value;
}

export function assertUndefinedPass<T>(value: T | undefined, message?: string): undefined {
  assertUndefined(value, message);
  return value;
}

export function assertDefinedPass<T>(value: T, message?: string): NonNullable<T> {
  assertDefined(value, message);
  return value;
}

export function assertStringPass(value: any, message?: string): string {
  assertString(value, message);
  return value;
}

export function assertNumberPass(value: any, message?: string): number {
  assertNumber(value, message);
  return value;
}

export function assertBooleanPass(value: any, message?: string): boolean {
  assertBoolean(value, message);
  return value;
}

export function assertFunctionPass<T extends Function | unknown>(value: T, message?: string): Extract<T, Function> { // eslint-disable-line @typescript-eslint/ban-types
  assertFunction(value, message);
  return value as Extract<T, Function>; // eslint-disable-line @typescript-eslint/ban-types
}
