/* eslint-disable @typescript-eslint/ban-types, @typescript-eslint/restrict-template-expressions, max-statements-per-line */

import type { AbstractConstructor, TypedArray } from '#/types';
import { AssertionError } from '../error';

export type InferIsType<T> = T extends (value: any) => value is infer R ? R : never;
export type InferIsNotType<ValueType, T> = T extends (value: any) => value is infer R ? Exclude<ValueType, R> : never;

export type AssertionMessage = string | (() => string);

export function assert(condition: boolean, message: AssertionMessage = 'assertion failed'): asserts condition {
  if (!condition) {
    throw new AssertionError(isFunction(message) ? message() : message);
  }
}

export function assertNot(condition: boolean, message: AssertionMessage = 'assertion failed'): asserts condition {
  if (condition) {
    throw new AssertionError(isFunction(message) ? message() : message);
  }
}

export function isType<T>(type: AbstractConstructor<T>, value: any): value is T { return (value instanceof type); }
export function isNotType<T>(type: AbstractConstructor<T>, value: any): value is InferIsNotType<T, typeof isType> { return !isType(type, value); }
export function assertType<T>(type: AbstractConstructor<T>, value: any, message: AssertionMessage = () => `Expected value to be of type ${type.name}.`): asserts value is T { assert(isType(type, value), message); }
export function assertNotType<T>(type: AbstractConstructor<T>, value: any, message: AssertionMessage = () => `Expected value to be not of type ${type.name}.`): asserts value is InferIsNotType<T, typeof isType> { assert(isNotType(type, value), message); }
export function assertTypePass<T>(type: AbstractConstructor<T>, value: any, message?: AssertionMessage): T { assertType(type, value, message); return value; }
export function assertNotTypePass<T>(type: AbstractConstructor<T>, value: any, message?: AssertionMessage): InferIsNotType<T, typeof isType> { assertNotType(type, value, message); return value; }

export function isUndefined(value: any): value is undefined { return value === undefined; }
export function isDefined<T>(value: T): value is InferIsNotType<T, typeof isUndefined> { return !isUndefined(value); }
export function assertUndefined(value: any, message: AssertionMessage = 'expected value to be undefined'): asserts value is InferIsType<typeof isUndefined> { assert(isUndefined(value), message); }
export function assertDefined<T>(value: T, message: AssertionMessage = 'expected value to not be undefined'): asserts value is InferIsNotType<T, typeof isUndefined> { assert(isDefined(value), message); }
export function assertUndefinedPass(value: any, message?: AssertionMessage): InferIsType<typeof isUndefined> { assertUndefined(value, message); return value; }
export function assertDefinedPass<T>(value: T, message?: AssertionMessage): InferIsNotType<T, typeof isUndefined> { assertDefined(value, message); return value; }

export function isNull(value: any): value is null { return value === null; }
export function isNotNull<T>(value: T): value is InferIsNotType<T, typeof isNull> { return !isNull(value); }
export function assertNull(value: any, message: AssertionMessage = 'expected value to be null'): asserts value is InferIsType<typeof isNull> { assert(isNull(value), message); }
export function assertNotNull<T>(value: T, message: AssertionMessage = 'expected value to not be null'): asserts value is InferIsNotType<T, typeof isNull> { assert(isNotNull(value), message); }
export function assertNullPass(value: any, message?: AssertionMessage): InferIsType<typeof isNull> { assertNull(value, message); return value; }
export function assertNotNullPass<T>(value: T, message?: AssertionMessage): InferIsNotType<T, typeof isNull> { assertNotNull(value, message); return value; }

export function isNullOrUndefined(value: any): value is null | undefined { return (value === null) || (value === undefined); }
export function isNotNullOrUndefined<T>(value: T): value is InferIsNotType<T, typeof isNullOrUndefined> { return !isNullOrUndefined(value); }
export function assertNullOrUndefined(value: any, message: AssertionMessage = 'expected value to be null or undefined'): asserts value is InferIsType<typeof isNullOrUndefined> { assert(isNullOrUndefined(value), message); }
export function assertNotNullOrUndefined<T>(value: T, message: AssertionMessage = 'expected value to not be null or undefined'): asserts value is InferIsNotType<T, typeof isNullOrUndefined> { assert(isNotNullOrUndefined(value), message); }
export function assertNullOrUndefinedPass(value: any, message?: AssertionMessage): InferIsType<typeof isNullOrUndefined> { assertNullOrUndefined(value, message); return value; }
export function assertNotNullOrUndefinedPass<T>(value: T, message?: AssertionMessage): InferIsNotType<T, typeof isNullOrUndefined> { assertNotNullOrUndefined(value, message); return value; }

export function isNumber(value: any): value is number { return (typeof value == 'number'); }
export function isNotNumber<T>(value: T): value is InferIsNotType<T, typeof isNumber> { return !isNumber(value); }
export function assertNumber(value: any, message: AssertionMessage = 'expected value to be number'): asserts value is InferIsType<typeof isNumber> { assert(isNumber(value), message); }
export function assertNotNumber<T>(value: T, message: AssertionMessage = 'expected value to not be number'): asserts value is InferIsNotType<T, typeof isNumber> { assert(isNotNumber(value), message); }
export function assertNumberPass(value: any, message?: AssertionMessage): InferIsType<typeof isNumber> { assertNumber(value, message); return value; }
export function assertNotNumberPass<T>(value: T, message?: AssertionMessage): InferIsNotType<T, typeof isNumber> { assertNotNumber(value, message); return value; }

export function isString(value: any): value is string { return (typeof value == 'string'); }
export function isNotString<T>(value: T): value is InferIsNotType<T, typeof isString> { return !isString(value); }
export function assertString(value: any, message: AssertionMessage = 'expected value to be string'): asserts value is InferIsType<typeof isString> { assert(isString(value), message); }
export function assertNotString<T>(value: T, message: AssertionMessage = 'expected value to not be string'): asserts value is InferIsNotType<T, typeof isString> { assert(isNotString(value), message); }
export function assertStringPass(value: any, message?: AssertionMessage): InferIsType<typeof isString> { assertString(value, message); return value; }
export function assertNotStringPass<T>(value: T, message?: AssertionMessage): InferIsNotType<T, typeof isString> { assertNotString(value, message); return value; }

export function isBoolean(value: any): value is boolean { return (typeof value == 'boolean'); }
export function isNotBoolean<T>(value: T): value is InferIsNotType<T, typeof isBoolean> { return !isBoolean(value); }
export function assertBoolean(value: any, message: AssertionMessage = 'expected value to be boolean'): asserts value is InferIsType<typeof isBoolean> { assert(isBoolean(value), message); }
export function assertNotBoolean<T>(value: T, message: AssertionMessage = 'expected value to not be boolean'): asserts value is InferIsNotType<T, typeof isBoolean> { assert(isNotBoolean(value), message); }
export function assertBooleanPass(value: any, message?: AssertionMessage): InferIsType<typeof isBoolean> { assertBoolean(value, message); return value; }
export function assertNotBooleanPass<T>(value: T, message?: AssertionMessage): InferIsNotType<T, typeof isBoolean> { assertNotBoolean(value, message); return value; }

export function isBigInt(value: any): value is bigint { return (typeof value == 'bigint'); }
export function isNotBigInt<T>(value: T): value is InferIsNotType<T, typeof isBigInt> { return !isBigInt(value); }
export function assertBigInt(value: any, message: AssertionMessage = 'expected value to be bigint'): asserts value is InferIsType<typeof isBigInt> { assert(isBigInt(value), message); }
export function assertNotBigInt<T>(value: T, message: AssertionMessage = 'expected value to not be bigint'): asserts value is InferIsNotType<T, typeof isBigInt> { assert(isNotBigInt(value), message); }
export function assertBigIntPass(value: any, message?: AssertionMessage): InferIsType<typeof isBigInt> { assertBigInt(value, message); return value; }
export function assertNotBigIntPass<T>(value: T, message?: AssertionMessage): InferIsNotType<T, typeof isBigInt> { assertNotBigInt(value, message); return value; }

export function isFunction<T extends Function = Function>(value: any): value is T { return (typeof value == 'function'); }
export function isNotFunction<T>(value: T): value is InferIsNotType<T, typeof isFunction> { return !isFunction(value); }
export function assertFunction<T extends Function = Function>(value: any, message: AssertionMessage = 'expected value to be function'): asserts value is InferIsType<typeof isFunction<T>> { assert(isFunction(value), message); }
export function assertNotFunction<T>(value: T, message: AssertionMessage = 'expected value to not be function'): asserts value is InferIsNotType<T, typeof isFunction> { assert(isNotFunction(value), message); }
export function assertFunctionPass<T extends Function = Function>(value: any, message?: AssertionMessage): InferIsType<typeof isFunction<T>> { assertFunction<T>(value, message); return value; }
export function assertNotFunctionPass<T>(value: T, message?: AssertionMessage): InferIsNotType<T, typeof isFunction> { assertNotFunction(value, message); return value; }

export function isSymbol(value: any): value is symbol { return (typeof value == 'symbol'); }
export function isNotSymbol<T>(value: T): value is InferIsNotType<T, typeof isSymbol> { return !isSymbol(value); }
export function assertSymbol(value: any, message: AssertionMessage = 'expected value to be symbol'): asserts value is InferIsType<typeof isSymbol> { assert(isSymbol(value), message); }
export function assertNotSymbol<T>(value: T, message: AssertionMessage = 'expected value to not be symbol'): asserts value is InferIsNotType<T, typeof isSymbol> { assert(isNotSymbol(value), message); }
export function assertSymbolPass(value: any, message?: AssertionMessage): InferIsType<typeof isSymbol> { assertSymbol(value, message); return value; }
export function assertNotSymbolPass<T>(value: T, message?: AssertionMessage): InferIsNotType<T, typeof isSymbol> { assertNotSymbol(value, message); return value; }

export function isObject(value: any): value is object { return ((value as {} | undefined)?.constructor == Object); }
export function isNotObject<T>(value: T): value is InferIsNotType<T, typeof isObject> { return !isObject(value); }
export function assertObject(value: any, message: AssertionMessage = 'expected value to be object'): asserts value is InferIsType<typeof isObject> { assert(isObject(value), message); }
export function assertNotObject<T>(value: T, message: AssertionMessage = 'expected value to not be object'): asserts value is InferIsNotType<T, typeof isObject> { assert(isNotObject(value), message); }
export function assertObjectPass(value: any, message?: AssertionMessage): InferIsType<typeof isObject> { assertObject(value, message); return value; }
export function assertNotObjectPass<T>(value: T, message?: AssertionMessage): InferIsNotType<T, typeof isObject> { assertNotObject(value, message); return value; }

export function isPrimitive(value: any): value is string | number | boolean | bigint | symbol | null | undefined { const type = typeof value; return type == 'string' || type == 'number' || type == 'boolean' || type == 'bigint' || type == 'symbol' || value === null || value === undefined; }
export function isNotPrimitive<T>(value: T): value is InferIsNotType<T, typeof isPrimitive> { return !isPrimitive(value); }
export function assertPrimitive(value: any, message: AssertionMessage = 'expected value to be primitive'): asserts value is InferIsType<typeof isPrimitive> { assert(isPrimitive(value), message); }
export function assertNotPrimitive<T>(value: T, message: AssertionMessage = 'expected value to not be primitive'): asserts value is InferIsNotType<T, typeof isPrimitive> { assert(isNotPrimitive(value), message); }
export function assertPrimitivePass(value: any, message?: AssertionMessage): InferIsType<typeof isPrimitive> { assertPrimitive(value, message); return value; }
export function assertNotPrimitivePass<T>(value: T, message?: AssertionMessage): InferIsNotType<T, typeof isPrimitive> { assertNotPrimitive(value, message); return value; }

export function isJsonPrimitive(value: any): value is string | number | boolean | null { const type = typeof value; return type == 'string' || type == 'number' || type == 'boolean' || value === null; }
export function isNotJsonPrimitive<T>(value: T): value is InferIsNotType<T, typeof isJsonPrimitive> { return !isJsonPrimitive(value); }
export function assertJsonPrimitive(value: any, message: AssertionMessage = 'expected value to be json-primitive'): asserts value is InferIsType<typeof isJsonPrimitive> { assert(isJsonPrimitive(value), message); }
export function assertNotJsonPrimitive<T>(value: T, message: AssertionMessage = 'expected value to not be json-primitive'): asserts value is InferIsNotType<T, typeof isJsonPrimitive> { assert(isNotJsonPrimitive(value), message); }
export function assertJsonPrimitivePass(value: any, message?: AssertionMessage): InferIsType<typeof isJsonPrimitive> { assertJsonPrimitive(value, message); return value; }
export function assertNotJsonPrimitivePass<T>(value: T, message?: AssertionMessage): InferIsNotType<T, typeof isJsonPrimitive> { assertNotJsonPrimitive(value, message); return value; }

export function isDate(value: any): value is Date { return (value instanceof Date); }
export function isNotDate<T>(value: T): value is InferIsNotType<T, typeof isDate> { return !isDate(value); }
export function assertDate(value: any, message: AssertionMessage = 'expected value to be Date'): asserts value is InferIsType<typeof isDate> { assert(isDate(value), message); }
export function assertNotDate<T>(value: T, message: AssertionMessage = 'expected value to not be Date'): asserts value is InferIsNotType<T, typeof isDate> { assert(isNotDate(value), message); }
export function assertDatePass(value: any, message?: AssertionMessage): InferIsType<typeof isDate> { assertDate(value, message); return value; }
export function assertNotDatePass<T>(value: T, message?: AssertionMessage): InferIsNotType<T, typeof isDate> { assertNotDate(value, message); return value; }

export function isValidDate(value: any): value is Date { return isDate(value) && !Number.isNaN(value.getTime()); }
export function isNotValidDate<T>(value: T): value is InferIsNotType<T, typeof isValidDate> { return !isValidDate(value); }
export function assertValidDate(value: any, message: AssertionMessage = 'expected value to be a valid Date'): asserts value is InferIsType<typeof isValidDate> { assert(isValidDate(value), message); }
export function assertNotValidDate<T>(value: T, message: AssertionMessage = 'expected value to not be a valid Date'): asserts value is InferIsNotType<T, typeof isValidDate> { assert(isNotValidDate(value), message); }
export function assertValidDatePass(value: any, message?: AssertionMessage): InferIsType<typeof isValidDate> { assertValidDate(value, message); return value; }
export function assertNotValidDatePass<T>(value: T, message?: AssertionMessage): InferIsNotType<T, typeof isValidDate> { assertNotValidDate(value, message); return value; }

export function isRegExp(value: any): value is RegExp { return (value instanceof RegExp); }
export function isNotRegExp<T>(value: T): value is InferIsNotType<T, typeof isRegExp> { return !isRegExp(value); }
export function assertRegExp(value: any, message: AssertionMessage = 'expected value to be RegExp'): asserts value is InferIsType<typeof isRegExp> { assert(isRegExp(value), message); }
export function assertNotRegExp<T>(value: T, message: AssertionMessage = 'expected value to not be RegExp'): asserts value is InferIsNotType<T, typeof isRegExp> { assert(isNotRegExp(value), message); }
export function assertRegExpPass(value: any, message?: AssertionMessage): InferIsType<typeof isRegExp> { assertRegExp(value, message); return value; }
export function assertNotRegExpPass<T>(value: T, message?: AssertionMessage): InferIsNotType<T, typeof isRegExp> { assertNotRegExp(value, message); return value; }

export function isArray(value: any): value is readonly any[] { return Array.isArray(value); }
export function isNotArray<T>(value: T): value is InferIsNotType<T, typeof isArray> { return !isArray(value); }
export function assertArray(value: any, message: AssertionMessage = 'expected value to be Array'): asserts value is InferIsType<typeof isArray> { assert(isArray(value), message); }
export function assertNotArray<T>(value: T, message: AssertionMessage = 'expected value to not be Array'): asserts value is InferIsNotType<T, typeof isArray> { assert(isNotArray(value), message); }
export function assertArrayPass(value: any, message?: AssertionMessage): InferIsType<typeof isArray> { assertArray(value, message); return value; }
export function assertNotArrayPass<T>(value: T, message?: AssertionMessage): InferIsNotType<T, typeof isArray> { assertNotArray(value, message); return value; }

export function isWritableArray(value: any): value is any[] { return isArray(value); }
export function isNotWritableArray<T>(value: T): value is InferIsNotType<T, typeof isWritableArray> { return isNotArray(value); }
export function assertWritableArray(value: any, message: AssertionMessage = 'expected value to be Array'): asserts value is InferIsType<typeof isWritableArray> { assertArray(value, message); }
export function assertNotWritableArray<T>(value: T, message: AssertionMessage = 'expected value to not be Array'): asserts value is InferIsNotType<T, typeof isWritableArray> { assertNotArray(value, message); }
export function assertWritableArrayPass(value: any, message?: AssertionMessage): InferIsType<typeof isWritableArray> { return assertArrayPass(value, message) as any[]; }
export function assertNotWritableArrayPass<T>(value: T, message?: AssertionMessage): InferIsNotType<T, typeof isWritableArray> { return assertNotArrayPass(value, message) as unknown as Exclude<T, any[]>; }

export function isBlob(value: any): value is Blob { return (value instanceof Blob); }
export function isNotBlob<T>(value: T): value is InferIsNotType<T, typeof isBlob> { return !isBlob(value); }
export function assertBlob(value: any, message: AssertionMessage = 'expected value to be Blob'): asserts value is InferIsType<typeof isBlob> { assert(isBlob(value), message); }
export function assertNotBlob<T>(value: T, message: AssertionMessage = 'expected value to not be Blob'): asserts value is InferIsNotType<T, typeof isBlob> { assert(isNotBlob(value), message); }
export function assertBlobPass(value: any, message?: AssertionMessage): InferIsType<typeof isBlob> { assertBlob(value, message); return value; }
export function assertNotBlobPass<T>(value: T, message?: AssertionMessage): InferIsNotType<T, typeof isBlob> { assertNotBlob(value, message); return value; }

export function isArrayBuffer(value: any): value is ArrayBuffer { return (value instanceof ArrayBuffer); }
export function isNotArrayBuffer<T>(value: T): value is InferIsNotType<T, typeof isArrayBuffer> { return !isArrayBuffer(value); }
export function assertArrayBuffer(value: any, message: AssertionMessage = 'expected value to be ArrayBuffer'): asserts value is InferIsType<typeof isArrayBuffer> { assert(isArrayBuffer(value), message); }
export function assertNotArrayBuffer<T>(value: T, message: AssertionMessage = 'expected value to not be ArrayBuffer'): asserts value is InferIsNotType<T, typeof isArrayBuffer> { assert(isNotArrayBuffer(value), message); }
export function assertArrayBufferPass(value: any, message?: AssertionMessage): InferIsType<typeof isArrayBuffer> { assertArrayBuffer(value, message); return value; }
export function assertNotArrayBufferPass<T>(value: T, message?: AssertionMessage): InferIsNotType<T, typeof isArrayBuffer> { assertNotArrayBuffer(value, message); return value; }

export function isArrayBufferView(value: any): value is ArrayBufferView { return ArrayBuffer.isView(value); }
export function isNotArrayBufferView<T>(value: T): value is InferIsNotType<T, typeof isArrayBufferView> { return !isArrayBufferView(value); }
export function assertArrayBufferView(value: any, message: AssertionMessage = 'expected value to be ArrayBufferView'): asserts value is InferIsType<typeof isArrayBufferView> { assert(isArrayBufferView(value), message); }
export function assertNotArrayBufferView<T>(value: T, message: AssertionMessage = 'expected value to not be ArrayBufferView'): asserts value is InferIsNotType<T, typeof isArrayBufferView> { assert(isNotArrayBufferView(value), message); }
export function assertArrayBufferViewPass(value: any, message?: AssertionMessage): InferIsType<typeof isArrayBufferView> { assertArrayBufferView(value, message); return value; }
export function assertNotArrayBufferViewPass<T>(value: T, message?: AssertionMessage): InferIsNotType<T, typeof isArrayBufferView> { assertNotArrayBufferView(value, message); return value; }

export function isTypedArray(value: any): value is TypedArray { return ArrayBuffer.isView(value) && isNotDataView(value); }
export function isNotTypedArray<T>(value: T): value is InferIsNotType<T, typeof isTypedArray> { return !isTypedArray(value); }
export function assertTypedArray(value: any, message: AssertionMessage = 'expected value to be TypedArray'): asserts value is InferIsType<typeof isTypedArray> { assert(isTypedArray(value), message); }
export function assertNotTypedArray<T>(value: T, message: AssertionMessage = 'expected value to not be TypedArray'): asserts value is InferIsNotType<T, typeof isTypedArray> { assert(isNotTypedArray(value), message); }
export function assertTypedArrayPass(value: any, message?: AssertionMessage): InferIsType<typeof isTypedArray> { assertTypedArray(value, message); return value; }
export function assertNotTypedArrayPass<T>(value: T, message?: AssertionMessage): InferIsNotType<T, typeof isTypedArray> { assertNotTypedArray(value, message); return value; }

export function isInt8Array(value: any): value is Int8Array { return (value instanceof Int8Array); }
export function isNotInt8Array<T>(value: T): value is InferIsNotType<T, typeof isInt8Array> { return !isInt8Array(value); }
export function assertInt8Array(value: any, message: AssertionMessage = 'expected value to be Int8Array'): asserts value is InferIsType<typeof isInt8Array> { assert(isInt8Array(value), message); }
export function assertNotInt8Array<T>(value: T, message: AssertionMessage = 'expected value to not be Int8Array'): asserts value is InferIsNotType<T, typeof isInt8Array> { assert(isNotInt8Array(value), message); }
export function assertInt8ArrayPass(value: any, message?: AssertionMessage): InferIsType<typeof isInt8Array> { assertInt8Array(value, message); return value; }
export function assertNotInt8ArrayPass<T>(value: T, message?: AssertionMessage): InferIsNotType<T, typeof isInt8Array> { assertNotInt8Array(value, message); return value; }

export function isUint8Array(value: any): value is Uint8Array { return (value instanceof Uint8Array); }
export function isNotUint8Array<T>(value: T): value is InferIsNotType<T, typeof isUint8Array> { return !isUint8Array(value); }
export function assertUint8Array(value: any, message: AssertionMessage = 'expected value to be Uint8Array'): asserts value is InferIsType<typeof isUint8Array> { assert(isUint8Array(value), message); }
export function assertNotUint8Array<T>(value: T, message: AssertionMessage = 'expected value to not be Uint8Array'): asserts value is InferIsNotType<T, typeof isUint8Array> { assert(isNotUint8Array(value), message); }
export function assertUint8ArrayPass(value: any, message?: AssertionMessage): InferIsType<typeof isUint8Array> { assertUint8Array(value, message); return value; }
export function assertNotUint8ArrayPass<T>(value: T, message?: AssertionMessage): InferIsNotType<T, typeof isUint8Array> { assertNotUint8Array(value, message); return value; }

export function isUint8ClampedArray(value: any): value is Uint8ClampedArray { return (value instanceof Uint8ClampedArray); }
export function isNotUint8ClampedArray<T>(value: T): value is InferIsNotType<T, typeof isUint8ClampedArray> { return !isUint8ClampedArray(value); }
export function assertUint8ClampedArray(value: any, message: AssertionMessage = 'expected value to be Uint8ClampedArray'): asserts value is InferIsType<typeof isUint8ClampedArray> { assert(isUint8ClampedArray(value), message); }
export function assertNotUint8ClampedArray<T>(value: T, message: AssertionMessage = 'expected value to not be Uint8ClampedArray'): asserts value is InferIsNotType<T, typeof isUint8ClampedArray> { assert(isNotUint8ClampedArray(value), message); }
export function assertUint8ClampedArrayPass(value: any, message?: AssertionMessage): InferIsType<typeof isUint8ClampedArray> { assertUint8ClampedArray(value, message); return value; }
export function assertNotUint8ClampedArrayPass<T>(value: T, message?: AssertionMessage): InferIsNotType<T, typeof isUint8ClampedArray> { assertNotUint8ClampedArray(value, message); return value; }

export function isInt16Array(value: any): value is Int16Array { return (value instanceof Int16Array); }
export function isNotInt16Array<T>(value: T): value is InferIsNotType<T, typeof isInt16Array> { return !isInt16Array(value); }
export function assertInt16Array(value: any, message: AssertionMessage = 'expected value to be Int16Array'): asserts value is InferIsType<typeof isInt16Array> { assert(isInt16Array(value), message); }
export function assertNotInt16Array<T>(value: T, message: AssertionMessage = 'expected value to not be Int16Array'): asserts value is InferIsNotType<T, typeof isInt16Array> { assert(isNotInt16Array(value), message); }
export function assertInt16ArrayPass(value: any, message?: AssertionMessage): InferIsType<typeof isInt16Array> { assertInt16Array(value, message); return value; }
export function assertNotInt16ArrayPass<T>(value: T, message?: AssertionMessage): InferIsNotType<T, typeof isInt16Array> { assertNotInt16Array(value, message); return value; }

export function isUint16Array(value: any): value is Uint16Array { return (value instanceof Uint16Array); }
export function isNotUint16Array<T>(value: T): value is InferIsNotType<T, typeof isUint16Array> { return !isUint16Array(value); }
export function assertUint16Array(value: any, message: AssertionMessage = 'expected value to be Uint16Array'): asserts value is InferIsType<typeof isUint16Array> { assert(isUint16Array(value), message); }
export function assertNotUint16Array<T>(value: T, message: AssertionMessage = 'expected value to not be Uint16Array'): asserts value is InferIsNotType<T, typeof isUint16Array> { assert(isNotUint16Array(value), message); }
export function assertUint16ArrayPass(value: any, message?: AssertionMessage): InferIsType<typeof isUint16Array> { assertUint16Array(value, message); return value; }
export function assertNotUint16ArrayPass<T>(value: T, message?: AssertionMessage): InferIsNotType<T, typeof isUint16Array> { assertNotUint16Array(value, message); return value; }

export function isInt32Array(value: any): value is Int32Array { return (value instanceof Int32Array); }
export function isNotInt32Array<T>(value: T): value is InferIsNotType<T, typeof isInt32Array> { return !isInt32Array(value); }
export function assertInt32Array(value: any, message: AssertionMessage = 'expected value to be Int32Array'): asserts value is InferIsType<typeof isInt32Array> { assert(isInt32Array(value), message); }
export function assertNotInt32Array<T>(value: T, message: AssertionMessage = 'expected value to not be Int32Array'): asserts value is InferIsNotType<T, typeof isInt32Array> { assert(isNotInt32Array(value), message); }
export function assertInt32ArrayPass(value: any, message?: AssertionMessage): InferIsType<typeof isInt32Array> { assertInt32Array(value, message); return value; }
export function assertNotInt32ArrayPass<T>(value: T, message?: AssertionMessage): InferIsNotType<T, typeof isInt32Array> { assertNotInt32Array(value, message); return value; }

export function isUint32Array(value: any): value is Uint32Array { return (value instanceof Uint32Array); }
export function isNotUint32Array<T>(value: T): value is InferIsNotType<T, typeof isUint32Array> { return !isUint32Array(value); }
export function assertUint32Array(value: any, message: AssertionMessage = 'expected value to be Uint32Array'): asserts value is InferIsType<typeof isUint32Array> { assert(isUint32Array(value), message); }
export function assertNotUint32Array<T>(value: T, message: AssertionMessage = 'expected value to not be Uint32Array'): asserts value is InferIsNotType<T, typeof isUint32Array> { assert(isNotUint32Array(value), message); }
export function assertUint32ArrayPass(value: any, message?: AssertionMessage): InferIsType<typeof isUint32Array> { assertUint32Array(value, message); return value; }
export function assertNotUint32ArrayPass<T>(value: T, message?: AssertionMessage): InferIsNotType<T, typeof isUint32Array> { assertNotUint32Array(value, message); return value; }

export function isFloat32Array(value: any): value is Float32Array { return (value instanceof Float32Array); }
export function isNotFloat32Array<T>(value: T): value is InferIsNotType<T, typeof isFloat32Array> { return !isFloat32Array(value); }
export function assertFloat32Array(value: any, message: AssertionMessage = 'expected value to be Float32Array'): asserts value is InferIsType<typeof isFloat32Array> { assert(isFloat32Array(value), message); }
export function assertNotFloat32Array<T>(value: T, message: AssertionMessage = 'expected value to not be Float32Array'): asserts value is InferIsNotType<T, typeof isFloat32Array> { assert(isNotFloat32Array(value), message); }
export function assertFloat32ArrayPass(value: any, message?: AssertionMessage): InferIsType<typeof isFloat32Array> { assertFloat32Array(value, message); return value; }
export function assertNotFloat32ArrayPass<T>(value: T, message?: AssertionMessage): InferIsNotType<T, typeof isFloat32Array> { assertNotFloat32Array(value, message); return value; }

export function isFloat64Array(value: any): value is Float64Array { return (value instanceof Float64Array); }
export function isNotFloat64Array<T>(value: T): value is InferIsNotType<T, typeof isFloat64Array> { return !isFloat64Array(value); }
export function assertFloat64Array(value: any, message: AssertionMessage = 'expected value to be Float64Array'): asserts value is InferIsType<typeof isFloat64Array> { assert(isFloat64Array(value), message); }
export function assertNotFloat64Array<T>(value: T, message: AssertionMessage = 'expected value to not be Float64Array'): asserts value is InferIsNotType<T, typeof isFloat64Array> { assert(isNotFloat64Array(value), message); }
export function assertFloat64ArrayPass(value: any, message?: AssertionMessage): InferIsType<typeof isFloat64Array> { assertFloat64Array(value, message); return value; }
export function assertNotFloat64ArrayPass<T>(value: T, message?: AssertionMessage): InferIsNotType<T, typeof isFloat64Array> { assertNotFloat64Array(value, message); return value; }

export function isBigInt64Array(value: any): value is BigInt64Array { return (value instanceof BigInt64Array); }
export function isNotBigInt64Array<T>(value: T): value is InferIsNotType<T, typeof isBigInt64Array> { return !isBigInt64Array(value); }
export function assertBigInt64Array(value: any, message: AssertionMessage = 'expected value to be BigInt64Array'): asserts value is InferIsType<typeof isBigInt64Array> { assert(isBigInt64Array(value), message); }
export function assertNotBigInt64Array<T>(value: T, message: AssertionMessage = 'expected value to not be BigInt64Array'): asserts value is InferIsNotType<T, typeof isBigInt64Array> { assert(isNotBigInt64Array(value), message); }
export function assertBigInt64ArrayPass(value: any, message?: AssertionMessage): InferIsType<typeof isBigInt64Array> { assertBigInt64Array(value, message); return value; }
export function assertNotBigInt64ArrayPass<T>(value: T, message?: AssertionMessage): InferIsNotType<T, typeof isBigInt64Array> { assertNotBigInt64Array(value, message); return value; }

export function isBigUint64Array(value: any): value is BigUint64Array { return (value instanceof BigUint64Array); }
export function isNotBigUint64Array<T>(value: T): value is InferIsNotType<T, typeof isBigUint64Array> { return !isBigUint64Array(value); }
export function assertBigUint64Array(value: any, message: AssertionMessage = 'expected value to be BigUint64Array'): asserts value is InferIsType<typeof isBigUint64Array> { assert(isBigUint64Array(value), message); }
export function assertNotBigUint64Array<T>(value: T, message: AssertionMessage = 'expected value to not be BigUint64Array'): asserts value is InferIsNotType<T, typeof isBigUint64Array> { assert(isNotBigUint64Array(value), message); }
export function assertBigUint64ArrayPass(value: any, message?: AssertionMessage): InferIsType<typeof isBigUint64Array> { assertBigUint64Array(value, message); return value; }
export function assertNotBigUint64ArrayPass<T>(value: T, message?: AssertionMessage): InferIsNotType<T, typeof isBigUint64Array> { assertNotBigUint64Array(value, message); return value; }

export function isDataView(value: any): value is DataView { return (value instanceof DataView); }
export function isNotDataView<T>(value: T): value is InferIsNotType<T, typeof isDataView> { return !isDataView(value); }
export function assertDataView(value: any, message: AssertionMessage = 'expected value to be DataView'): asserts value is InferIsType<typeof isDataView> { assert(isDataView(value), message); }
export function assertNotDataView<T>(value: T, message: AssertionMessage = 'expected value to not be DataView'): asserts value is InferIsNotType<T, typeof isDataView> { assert(isNotDataView(value), message); }
export function assertDataViewPass(value: any, message?: AssertionMessage): InferIsType<typeof isDataView> { assertDataView(value, message); return value; }
export function assertNotDataViewPass<T>(value: T, message?: AssertionMessage): InferIsNotType<T, typeof isDataView> { assertNotDataView(value, message); return value; }

export function isSet<T>(value: Set<T> | any): value is Set<T> { return (value instanceof Set); }
export function isNotSet<T>(value: T): value is InferIsNotType<T, typeof isSet> { return !isSet(value); }
export function assertSet<T>(value: Set<T> | any, message: AssertionMessage = 'expected value to be Set'): asserts value is Set<T> { assert(isSet(value), message); }
export function assertNotSet<T>(value: T, message: AssertionMessage = 'expected value to not be Set'): asserts value is InferIsNotType<T, typeof isSet> { assert(isNotSet(value), message); }
export function assertSetPass<T>(value: Set<T> | any, message?: AssertionMessage): Set<T> { assertSet(value, message); return value as Set<T>; }
export function assertNotSetPass<T>(value: T, message?: AssertionMessage): InferIsNotType<T, typeof isSet> { assertNotSet(value, message); return value; }

export function isMap<K, V>(value: Map<K, V> | any): value is Map<K, V> { return (value instanceof Map); }
export function isNotMap<T>(value: T): value is InferIsNotType<T, typeof isMap> { return !isMap(value); }
export function assertMap<K, V>(value: Map<K, V> | any, message: AssertionMessage = 'expected value to be Map'): asserts value is Map<K, V> { assert(isMap(value), message); }
export function assertNotMap<T>(value: T, message: AssertionMessage = 'expected value to not be Map'): asserts value is InferIsNotType<T, typeof isMap> { assert(isNotMap(value), message); }
export function assertMapPass<K, V>(value: Map<K, V> | any, message?: AssertionMessage): Map<K, V> { assertMap(value, message); return value as Map<K, V>; }
export function assertNotMapPass<T>(value: T, message?: AssertionMessage): InferIsNotType<T, typeof isMap> { assertNotMap(value, message); return value; }

export function isPromise<T>(value: Promise<T> | any): value is Promise<T> { return (value instanceof Promise); }
export function isNotPromise<T>(value: T): value is InferIsNotType<T, typeof isPromise> { return !isPromise(value); }
export function assertPromise<T>(value: Promise<T> | any, message: AssertionMessage = 'expected value to be Promise'): asserts value is Promise<T> { assert(isPromise(value), message); }
export function assertNotPromise<T>(value: T, message: AssertionMessage = 'expected value to not be Promise'): asserts value is InferIsNotType<T, typeof isPromise> { assert(isNotPromise(value), message); }
export function assertPromisePass<T>(value: Promise<T> | any, message?: AssertionMessage): Promise<T> { assertPromise(value, message); return value as Promise<T>; } // eslint-disable-line @typescript-eslint/promise-function-async
export function assertNotPromisePass<T>(value: T, message?: AssertionMessage): InferIsNotType<T, typeof isPromise> { assertNotPromise(value, message); return value; }
