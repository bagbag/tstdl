/* eslint-disable @typescript-eslint/ban-types, @typescript-eslint/restrict-template-expressions, max-statements-per-line */

import type { TypedArray } from '#/types';
import { AssertionError } from '../error';

type InferIsType<T> = T extends (value: any) => value is infer R ? R : never;
type InferIsNotType<ValueType, T> = T extends (value: any) => value is infer R ? Exclude<ValueType, R> : never;

export function assert(condition: boolean, message: string = 'assertion failed'): asserts condition {
  if (!condition) {
    throw new AssertionError(message);
  }
}

export function assertNot(condition: boolean, message: string = 'assertion failed'): asserts condition {
  if (condition) {
    throw new AssertionError(message);
  }
}

export function isUndefined(value: any): value is undefined { return value === undefined; }
export function isDefined<T>(value: T): value is InferIsNotType<T, typeof isUndefined> { return !isUndefined(value); }
export function assertUndefined(value: any, message: string = `expected value to be undefined, but it is ${value}`): asserts value is InferIsType<typeof isUndefined> { assert(isUndefined(value), message); }
export function assertDefined<T>(value: T, message: string = `expected value to not be undefined, but it is ${value}`): asserts value is InferIsNotType<T, typeof isUndefined> { assert(isDefined(value), message); }
export function assertUndefinedPass(value: any, message?: string): InferIsType<typeof isUndefined> { assertUndefined(value, message); return value; }
export function assertDefinedPass<T>(value: T, message?: string): InferIsNotType<T, typeof isUndefined> { assertDefined(value, message); return value; }

export function isNull(value: any): value is null { return value === null; }
export function isNotNull<T>(value: T): value is InferIsNotType<T, typeof isNull> { return !isNull(value); }
export function assertNull(value: any, message: string = `expected value to be null, but it is ${value}`): asserts value is InferIsType<typeof isNull> { assert(isNull(value), message); }
export function assertNotNull<T>(value: T, message: string = `expected value to not be null, but it is ${value}`): asserts value is InferIsNotType<T, typeof isNull> { assert(isNotNull(value), message); }
export function assertNullPass(value: any, message?: string): InferIsType<typeof isNull> { assertNull(value, message); return value; }
export function assertNotNullPass<T>(value: T, message?: string): InferIsNotType<T, typeof isNull> { assertNotNull(value, message); return value; }

export function isNullOrUndefined(value: any): value is null | undefined { return (value === null) || (value === undefined); }
export function isNotNullOrUndefined<T>(value: T): value is InferIsNotType<T, typeof isNullOrUndefined> { return !isNullOrUndefined(value); }
export function assertNullOrUndefined(value: any, message: string = `expected value to be null or undefined, but it is ${value}`): asserts value is InferIsType<typeof isNullOrUndefined> { assert(isNullOrUndefined(value), message); }
export function assertNotNullOrUndefined<T>(value: T, message: string = `expected value to not be null or undefined, but it is ${value}`): asserts value is InferIsNotType<T, typeof isNullOrUndefined> { assert(isNotNullOrUndefined(value), message); }
export function assertNullOrUndefinedPass(value: any, message?: string): InferIsType<typeof isNullOrUndefined> { assertNullOrUndefined(value, message); return value; }
export function assertNotNullOrUndefinedPass<T>(value: T, message?: string): InferIsNotType<T, typeof isNullOrUndefined> { assertNotNullOrUndefined(value, message); return value; }

export function isNumber(value: any): value is number { return (typeof value == 'number'); }
export function isNotNumber<T>(value: T): value is InferIsNotType<T, typeof isNumber> { return !isNumber(value); }
export function assertNumber(value: any, message: string = `expected value to be number, but it is ${value}`): asserts value is InferIsType<typeof isNumber> { assert(isNumber(value), message); }
export function assertNotNumber<T>(value: T, message: string = `expected value to not be number, but it is ${value}`): asserts value is InferIsNotType<T, typeof isNumber> { assert(isNotNumber(value), message); }
export function assertNumberPass(value: any, message?: string): InferIsType<typeof isNumber> { assertNumber(value, message); return value; }
export function assertNotNumberPass<T>(value: T, message?: string): InferIsNotType<T, typeof isNumber> { assertNotNumber(value, message); return value; }

export function isString(value: any): value is string { return (typeof value == 'string'); }
export function isNotString<T>(value: T): value is InferIsNotType<T, typeof isString> { return !isString(value); }
export function assertString(value: any, message: string = `expected value to be string, but it is ${value}`): asserts value is InferIsType<typeof isString> { assert(isString(value), message); }
export function assertNotString<T>(value: T, message: string = `expected value to not be string, but it is ${value}`): asserts value is InferIsNotType<T, typeof isString> { assert(isNotString(value), message); }
export function assertStringPass(value: any, message?: string): InferIsType<typeof isString> { assertString(value, message); return value; }
export function assertNotStringPass<T>(value: T, message?: string): InferIsNotType<T, typeof isString> { assertNotString(value, message); return value; }

export function isBoolean(value: any): value is boolean { return (typeof value == 'boolean'); }
export function isNotBoolean<T>(value: T): value is InferIsNotType<T, typeof isBoolean> { return !isBoolean(value); }
export function assertBoolean(value: any, message: string = `expected value to be boolean, but it is ${value}`): asserts value is InferIsType<typeof isBoolean> { assert(isBoolean(value), message); }
export function assertNotBoolean<T>(value: T, message: string = `expected value to not be boolean, but it is ${value}`): asserts value is InferIsNotType<T, typeof isBoolean> { assert(isNotBoolean(value), message); }
export function assertBooleanPass(value: any, message?: string): InferIsType<typeof isBoolean> { assertBoolean(value, message); return value; }
export function assertNotBooleanPass<T>(value: T, message?: string): InferIsNotType<T, typeof isBoolean> { assertNotBoolean(value, message); return value; }

export function isBigInt(value: any): value is bigint { return (typeof value == 'bigint'); }
export function isNotBigInt<T>(value: T): value is InferIsNotType<T, typeof isBigInt> { return !isBigInt(value); }
export function assertBigInt(value: any, message: string = `expected value to be bigint, but it is ${value}`): asserts value is InferIsType<typeof isBigInt> { assert(isBigInt(value), message); }
export function assertNotBigInt<T>(value: T, message: string = `expected value to not be bigint, but it is ${value}`): asserts value is InferIsNotType<T, typeof isBigInt> { assert(isNotBigInt(value), message); }
export function assertBigIntPass(value: any, message?: string): InferIsType<typeof isBigInt> { assertBigInt(value, message); return value; }
export function assertNotBigIntPass<T>(value: T, message?: string): InferIsNotType<T, typeof isBigInt> { assertNotBigInt(value, message); return value; }

export function isFunction(value: any): value is Function { return (typeof value == 'function'); }
export function isNotFunction<T>(value: T): value is InferIsNotType<T, typeof isFunction> { return !isFunction(value); }
export function assertFunction(value: any, message: string = `expected value to be function, but it is ${value}`): asserts value is InferIsType<typeof isFunction> { assert(isFunction(value), message); }
export function assertNotFunction<T>(value: T, message: string = `expected value to not be function, but it is ${value}`): asserts value is InferIsNotType<T, typeof isFunction> { assert(isNotFunction(value), message); }
export function assertFunctionPass(value: any, message?: string): InferIsType<typeof isFunction> { assertFunction(value, message); return value as Function; }
export function assertNotFunctionPass<T>(value: T, message?: string): InferIsNotType<T, typeof isFunction> { assertNotFunction(value, message); return value; }

export function isSymbol(value: any): value is symbol { return (typeof value == 'symbol'); }
export function isNotSymbol<T>(value: T): value is InferIsNotType<T, typeof isSymbol> { return !isSymbol(value); }
export function assertSymbol(value: any, message: string = `expected value to be symbol, but it is ${value}`): asserts value is InferIsType<typeof isSymbol> { assert(isSymbol(value), message); }
export function assertNotSymbol<T>(value: T, message: string = `expected value to not be symbol, but it is ${value}`): asserts value is InferIsNotType<T, typeof isSymbol> { assert(isNotSymbol(value), message); }
export function assertSymbolPass(value: any, message?: string): InferIsType<typeof isSymbol> { assertSymbol(value, message); return value; }
export function assertNotSymbolPass<T>(value: T, message?: string): InferIsNotType<T, typeof isSymbol> { assertNotSymbol(value, message); return value; }

export function isObject(value: any): value is object { return (typeof value == 'object'); }
export function isNotObject<T>(value: T): value is InferIsNotType<T, typeof isObject> { return !isObject(value); }
export function assertObject(value: any, message: string = `expected value to be object, but it is ${value}`): asserts value is InferIsType<typeof isObject> { assert(isObject(value), message); }
export function assertNotObject<T>(value: T, message: string = `expected value to not be object, but it is ${value}`): asserts value is InferIsNotType<T, typeof isObject> { assert(isNotObject(value), message); }
export function assertObjectPass(value: any, message?: string): InferIsType<typeof isObject> { assertObject(value, message); return value; }
export function assertNotObjectPass<T>(value: T, message?: string): InferIsNotType<T, typeof isObject> { assertNotObject(value, message); return value; }

export function isPrimitive(value: any): value is string | number | boolean | bigint | symbol | null | undefined { const type = typeof value; return type == 'string' || type == 'number' || type == 'boolean' || type == 'bigint' || type == 'symbol' || value === null || value === undefined; }
export function isNotPrimitive<T>(value: T): value is InferIsNotType<T, typeof isPrimitive> { return !isPrimitive(value); }
export function assertPrimitive(value: any, message: string = `expected value to be primitive, but it is ${value}`): asserts value is InferIsType<typeof isPrimitive> { assert(isPrimitive(value), message); }
export function assertNotPrimitive<T>(value: T, message: string = `expected value to not be primitive, but it is ${value}`): asserts value is InferIsNotType<T, typeof isPrimitive> { assert(isNotPrimitive(value), message); }
export function assertPrimitivePass(value: any, message?: string): InferIsType<typeof isPrimitive> { assertPrimitive(value, message); return value; }
export function assertNotPrimitivePass<T>(value: T, message?: string): InferIsNotType<T, typeof isPrimitive> { assertNotPrimitive(value, message); return value; }

export function isDate(value: any): value is Date { return (value instanceof Date); }
export function isNotDate<T>(value: T): value is InferIsNotType<T, typeof isDate> { return !isDate(value); }
export function assertDate(value: any, message: string = `expected value to be Date, but it is ${value}`): asserts value is InferIsType<typeof isDate> { assert(isDate(value), message); }
export function assertNotDate<T>(value: T, message: string = `expected value to not be Date, but it is ${value}`): asserts value is InferIsNotType<T, typeof isDate> { assert(isNotDate(value), message); }
export function assertDatePass(value: any, message?: string): InferIsType<typeof isDate> { assertDate(value, message); return value; }
export function assertNotDatePass<T>(value: T, message?: string): InferIsNotType<T, typeof isDate> { assertNotDate(value, message); return value; }

export function isRegExp(value: any): value is RegExp { return (value instanceof RegExp); }
export function isNotRegExp<T>(value: T): value is InferIsNotType<T, typeof isRegExp> { return !isRegExp(value); }
export function assertRegExp(value: any, message: string = `expected value to be RegExp, but it is ${value}`): asserts value is InferIsType<typeof isRegExp> { assert(isRegExp(value), message); }
export function assertNotRegExp<T>(value: T, message: string = `expected value to not be RegExp, but it is ${value}`): asserts value is InferIsNotType<T, typeof isRegExp> { assert(isNotRegExp(value), message); }
export function assertRegExpPass(value: any, message?: string): InferIsType<typeof isRegExp> { assertRegExp(value, message); return value; }
export function assertNotRegExpPass<T>(value: T, message?: string): InferIsNotType<T, typeof isRegExp> { assertNotRegExp(value, message); return value; }

export function isArray(value: any): value is any[] { return Array.isArray(value); }
export function isNotArray<T>(value: T): value is InferIsNotType<T, typeof isArray> { return !isArray(value); }
export function assertArray(value: any, message: string = `expected value to be Array, but it is ${value}`): asserts value is InferIsType<typeof isArray> { assert(isArray(value), message); }
export function assertNotArray<T>(value: T, message: string = `expected value to not be Array, but it is ${value}`): asserts value is InferIsNotType<T, typeof isArray> { assert(isNotArray(value), message); }
export function assertArrayPass(value: any, message?: string): InferIsType<typeof isArray> { assertArray(value, message); return value; }
export function assertNotArrayPass<T>(value: T, message?: string): InferIsNotType<T, typeof isArray> { assertNotArray(value, message); return value; }

export function isTypedArray(value: any): value is TypedArray { return (value instanceof Int8Array) || (value instanceof Uint8Array) || (value instanceof Uint8ClampedArray) || (value instanceof Int16Array) || (value instanceof Uint16Array) || (value instanceof Int32Array) || (value instanceof Uint32Array) || (value instanceof Float32Array) || (value instanceof Float64Array) || (value instanceof BigInt64Array) || (value instanceof BigUint64Array); }
export function isNotTypedArray<T>(value: T): value is InferIsNotType<T, typeof isTypedArray> { return !isTypedArray(value); }
export function assertTypedArray(value: any, message: string = `expected value to be TypedArray, but it is ${value}`): asserts value is InferIsType<typeof isTypedArray> { assert(isTypedArray(value), message); }
export function assertNotTypedArray<T>(value: T, message: string = `expected value to not be TypedArray, but it is ${value}`): asserts value is InferIsNotType<T, typeof isTypedArray> { assert(isNotTypedArray(value), message); }
export function assertTypedArrayPass(value: any, message?: string): InferIsType<typeof isTypedArray> { assertTypedArray(value, message); return value; }
export function assertNotTypedArrayPass<T>(value: T, message?: string): InferIsNotType<T, typeof isTypedArray> { assertNotTypedArray(value, message); return value; }

export function isArrayBuffer(value: any): value is ArrayBuffer { return (value instanceof ArrayBuffer); }
export function isNotArrayBuffer<T>(value: T): value is InferIsNotType<T, typeof isArrayBuffer> { return !isArrayBuffer(value); }
export function assertArrayBuffer(value: any, message: string = `expected value to be ArrayBuffer, but it is ${value}`): asserts value is InferIsType<typeof isArrayBuffer> { assert(isArrayBuffer(value), message); }
export function assertNotArrayBuffer<T>(value: T, message: string = `expected value to not be ArrayBuffer, but it is ${value}`): asserts value is InferIsNotType<T, typeof isArrayBuffer> { assert(isNotArrayBuffer(value), message); }
export function assertArrayBufferPass(value: any, message?: string): InferIsType<typeof isArrayBuffer> { assertArrayBuffer(value, message); return value; }
export function assertNotArrayBufferPass<T>(value: T, message?: string): InferIsNotType<T, typeof isArrayBuffer> { assertNotArrayBuffer(value, message); return value; }
