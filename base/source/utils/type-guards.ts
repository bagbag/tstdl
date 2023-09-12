/* eslint-disable @typescript-eslint/ban-types, @typescript-eslint/restrict-template-expressions, max-statements-per-line, no-eq-null */

import { supportsBlob, supportsReadableStream } from '#/supports.js';
import type { AbstractConstructor, JsonPrimitive, Primitive, TypedArray } from '#/types.js';
import type { PascalCase } from 'type-fest';
import { AssertionError } from '../error/assertion.error.js';

export type AssertionMessage = string | (() => string);

export type IsFunction<T> = <U extends T = T>(value: any) => value is U;
export type IsNotFunction<T> = <V>(value: V) => value is Exclude<V, T>;
export type AssertFunction<T> = <U extends T = T>(value: any, message?: AssertionMessage) => asserts value is U;
export type AssertNotFunction<T> = <V>(value: V, message?: AssertionMessage) => asserts value is Exclude<V, T>;
export type AssertPassFunction<T> = <U extends T = T>(value: any, message?: AssertionMessage) => U;
export type AssertNotPassFunction<T> = <V>(value: V, message?: AssertionMessage) => Exclude<V, T>;

export type GuardFunctions<N extends string, T> =
  & { [P in `is${PascalCase<N>}`]: IsFunction<T> }
  & { [P in `isNot${PascalCase<N>}`]: IsNotFunction<T> }
  & { [P in `assert${PascalCase<N>}`]: AssertFunction<T> }
  & { [P in `assertNot${PascalCase<N>}`]: AssertNotFunction<T> }
  & { [P in `assert${PascalCase<N>}Pass`]: AssertPassFunction<T> }
  & { [P in `assertNot${PascalCase<N>}Pass`]: AssertNotPassFunction<T> };

export function assert(condition: boolean, message: AssertionMessage = 'assertion failed'): asserts condition {
  if (!condition) {
    throw new AssertionError((typeof message == 'function') ? message() : message);
  }
}

export function assertNot(condition: boolean, message: AssertionMessage = 'assertion failed'): asserts condition {
  if (condition) {
    throw new AssertionError((typeof message == 'function') ? message() : message);
  }
}

export function createGuards<N extends string, T>(name: N, testFn: (value: any) => value is T): GuardFunctions<N, T> {
  const normalizedName = name.split(' ').map((slice) => slice[0]!.toUpperCase() + slice.slice(1)).join('');
  const defaultMessage = `Expected value to be ${name}.`;
  const defaultNotMessage = `Expected value to not be ${name}.`;

  return {
    [`is${normalizedName}`](value: any): value is T {
      return testFn(value);
    },
    [`isNot${normalizedName}`]<V>(value: V): value is Exclude<V, T> {
      return !testFn(value);
    },
    [`assert${normalizedName}`](value: any, message: AssertionMessage = defaultMessage): asserts value is T {
      assert(testFn(value), message);
    },
    [`assertNot${normalizedName}`]<V>(value: V, message: AssertionMessage = defaultNotMessage): asserts value is Exclude<V, T> {
      assertNot(testFn(value), message);
    },
    [`assert${normalizedName}Pass`](value: any, message: AssertionMessage = defaultMessage): T {
      assert(testFn(value), message);
      return value;
    },
    [`assertNot${normalizedName}Pass`]<V>(value: V, message: AssertionMessage = defaultNotMessage): Exclude<V, T> {
      assertNot(testFn(value), message);
      return value as Exclude<V, T>;
    }
  } as GuardFunctions<N, T>;
}

export function createInstanceGuards<N extends string, T>(name: N, type: AbstractConstructor<T>): GuardFunctions<N, T> {
  return createGuards(name, (value): value is T => value instanceof type);
}

const undefinedGuards = createGuards('undefined', (value): value is undefined => (value === undefined));
export const isUndefined: IsFunction<undefined | void> = undefinedGuards.isUndefined;
export const isDefined: IsNotFunction<undefined | void> = undefinedGuards.isNotUndefined;
export const assertUndefined: AssertFunction<undefined | void> = undefinedGuards.assertUndefined;
export const assertDefined: AssertNotFunction<undefined | void> = undefinedGuards.assertNotUndefined;
export const assertUndefinedPass: AssertPassFunction<undefined | void> = undefinedGuards.assertUndefinedPass;
export const assertDefinedPass: AssertNotPassFunction<undefined | void> = undefinedGuards.assertNotUndefinedPass;

const nullGuards = createGuards('null', (value): value is null => (value === null));
export const isNull: IsFunction<null> = nullGuards.isNull;
export const isNotNull: IsNotFunction<null> = nullGuards.isNotNull;
export const assertNull: AssertFunction<null> = nullGuards.assertNull;
export const assertNotNull: AssertNotFunction<null> = nullGuards.assertNotNull;
export const assertNullPass: AssertPassFunction<null> = nullGuards.assertNullPass;
export const assertNotNullPass: AssertNotPassFunction<null> = nullGuards.assertNotNullPass;

const nullOrUndefinedGuards = createGuards('null or undefined', (value): value is null | undefined => (value === null) || (value === undefined));
export const isNullOrUndefined: IsFunction<null | undefined> = nullOrUndefinedGuards.isNullOrUndefined;
export const isNotNullOrUndefined: IsNotFunction<null | undefined> = nullOrUndefinedGuards.isNotNullOrUndefined;
export const assertNullOrUndefined: AssertFunction<null | undefined> = nullOrUndefinedGuards.assertNullOrUndefined;
export const assertNotNullOrUndefined: AssertNotFunction<null | undefined> = nullOrUndefinedGuards.assertNotNullOrUndefined;
export const assertNullOrUndefinedPass: AssertPassFunction<null | undefined> = nullOrUndefinedGuards.assertNullOrUndefinedPass;
export const assertNotNullOrUndefinedPass: AssertNotPassFunction<null | undefined> = nullOrUndefinedGuards.assertNotNullOrUndefinedPass;

const numberGuards = createGuards('number', (value): value is number => (typeof value == 'number'));
export const isNumber: IsFunction<number> = numberGuards.isNumber;
export const isNotNumber: IsNotFunction<number> = numberGuards.isNotNumber;
export const assertNumber: AssertFunction<number> = numberGuards.assertNumber;
export const assertNotNumber: AssertNotFunction<number> = numberGuards.assertNotNumber;
export const assertNumberPass: AssertPassFunction<number> = numberGuards.assertNumberPass;
export const assertNotNumberPass: AssertNotPassFunction<number> = numberGuards.assertNotNumberPass;

const stringGuards = createGuards('string', (value): value is string => (typeof value == 'string'));
export const isString: IsFunction<string> = stringGuards.isString;
export const isNotString: IsNotFunction<string> = stringGuards.isNotString;
export const assertString: AssertFunction<string> = stringGuards.assertString;
export const assertNotString: AssertNotFunction<string> = stringGuards.assertNotString;
export const assertStringPass: AssertPassFunction<string> = stringGuards.assertStringPass;
export const assertNotStringPass: AssertNotPassFunction<string> = stringGuards.assertNotStringPass;

const booleanGuards = createGuards('boolean', (value): value is boolean => (typeof value == 'boolean'));
export const isBoolean: IsFunction<boolean> = booleanGuards.isBoolean;
export const isNotBoolean: IsNotFunction<boolean> = booleanGuards.isNotBoolean;
export const assertBoolean: AssertFunction<boolean> = booleanGuards.assertBoolean;
export const assertNotBoolean: AssertNotFunction<boolean> = booleanGuards.assertNotBoolean;
export const assertBooleanPass: AssertPassFunction<boolean> = booleanGuards.assertBooleanPass;
export const assertNotBooleanPass: AssertNotPassFunction<boolean> = booleanGuards.assertNotBooleanPass;

const bigintGuards = createGuards('bigint', (value): value is bigint => (typeof value == 'bigint'));
export const isBigInt: IsFunction<bigint> = bigintGuards.isBigint;
export const isNotBigInt: IsNotFunction<bigint> = bigintGuards.isNotBigint;
export const assertBigInt: AssertFunction<bigint> = bigintGuards.assertBigint;
export const assertNotBigInt: AssertNotFunction<bigint> = bigintGuards.assertNotBigint;
export const assertBigIntPass: AssertPassFunction<bigint> = bigintGuards.assertBigintPass;
export const assertNotBigIntPass: AssertNotPassFunction<bigint> = bigintGuards.assertNotBigintPass;

const functionGuards = createGuards('function', (value): value is Function => (typeof value == 'function'));
export const isFunction: IsFunction<Function> = functionGuards.isFunction;
export const isNotFunction: IsNotFunction<Function> = functionGuards.isNotFunction;
export const assertFunction: AssertFunction<Function> = functionGuards.assertFunction;
export const assertNotFunction: AssertNotFunction<Function> = functionGuards.assertNotFunction;
export const assertFunctionPass: AssertPassFunction<Function> = functionGuards.assertFunctionPass;
export const assertNotFunctionPass: AssertNotPassFunction<Function> = functionGuards.assertNotFunctionPass;

const symbolGuards = createGuards('symbol', (value): value is symbol => (typeof value == 'symbol'));
export const isSymbol: IsFunction<symbol> = symbolGuards.isSymbol;
export const isNotSymbol: IsNotFunction<symbol> = symbolGuards.isNotSymbol;
export const assertSymbol: AssertFunction<symbol> = symbolGuards.assertSymbol;
export const assertNotSymbol: AssertNotFunction<symbol> = symbolGuards.assertNotSymbol;
export const assertSymbolPass: AssertPassFunction<symbol> = symbolGuards.assertSymbolPass;
export const assertNotSymbolPass: AssertNotPassFunction<symbol> = symbolGuards.assertNotSymbolPass;

const literalObjectGuards = createGuards('literal object', (value): value is object => (typeof value == 'object') && (value != null) && (Reflect.getPrototypeOf(value as object) == Object.prototype) && (Reflect.getPrototypeOf(value as object)!.constructor == Object));
export const isLiteralObject: IsFunction<object> = literalObjectGuards.isLiteralObject;
export const isNotLiteralObject: IsNotFunction<object> = literalObjectGuards.isNotLiteralObject;
export const assertLiteralObject: AssertFunction<object> = literalObjectGuards.assertLiteralObject;
export const assertNotLiteralObject: AssertNotFunction<object> = literalObjectGuards.assertNotLiteralObject;
export const assertLiteralObjectPass: AssertPassFunction<object> = literalObjectGuards.assertLiteralObjectPass;
export const assertNotLiteralObjectPass: AssertNotPassFunction<object> = literalObjectGuards.assertNotLiteralObjectPass;

const objectGuards = createGuards('object', (value): value is object => (typeof value == 'object') && (value != null));
export const isObject: IsFunction<object> = objectGuards.isObject;
export const isNotObject: IsNotFunction<object> = objectGuards.isNotObject;
export const assertObject: AssertFunction<object> = objectGuards.assertObject;
export const assertNotObject: AssertNotFunction<object> = objectGuards.assertNotObject;
export const assertObjectPass: AssertPassFunction<object> = objectGuards.assertObjectPass;
export const assertNotObjectPass: AssertNotPassFunction<object> = objectGuards.assertNotObjectPass;

const primitiveGuards = createGuards('primitive', (value): value is Primitive => {
  const type = typeof value;
  return (type == 'string') || (type == 'number') || (type == 'boolean') || (type == 'bigint') || (type == 'symbol') || (value === null) || (value === undefined);
});
export const isPrimitive: IsFunction<Primitive> = primitiveGuards.isPrimitive;
export const isNotPrimitive: IsNotFunction<Primitive> = primitiveGuards.isNotPrimitive;
export const assertPrimitive: AssertFunction<Primitive> = primitiveGuards.assertPrimitive;
export const assertNotPrimitive: AssertNotFunction<Primitive> = primitiveGuards.assertNotPrimitive;
export const assertPrimitivePass: AssertPassFunction<Primitive> = primitiveGuards.assertPrimitivePass;
export const assertNotPrimitivePass: AssertNotPassFunction<Primitive> = primitiveGuards.assertNotPrimitivePass;

const jsonPrimitiveGuards = createGuards('json primitive', (value): value is JsonPrimitive => {
  const type = typeof value;
  return (type == 'string') || (type == 'number') || (type == 'boolean') || (value === null);
});
export const isJsonPrimitive: IsFunction<JsonPrimitive> = jsonPrimitiveGuards.isJsonPrimitive;
export const isNotJsonPrimitive: IsNotFunction<JsonPrimitive> = jsonPrimitiveGuards.isNotJsonPrimitive;
export const assertJsonPrimitive: AssertFunction<JsonPrimitive> = jsonPrimitiveGuards.assertJsonPrimitive;
export const assertNotJsonPrimitive: AssertNotFunction<JsonPrimitive> = jsonPrimitiveGuards.assertNotJsonPrimitive;
export const assertJsonPrimitivePass: AssertPassFunction<JsonPrimitive> = jsonPrimitiveGuards.assertJsonPrimitivePass;
export const assertNotJsonPrimitivePass: AssertNotPassFunction<JsonPrimitive> = jsonPrimitiveGuards.assertNotJsonPrimitivePass;

const dateGuards = createInstanceGuards('date', Date);
export const isDate: IsFunction<Date> = dateGuards.isDate;
export const isNotDate: IsNotFunction<Date> = dateGuards.isNotDate;
export const assertDate: AssertFunction<Date> = dateGuards.assertDate;
export const assertNotDate: AssertNotFunction<Date> = dateGuards.assertNotDate;
export const assertDatePass: AssertPassFunction<Date> = dateGuards.assertDatePass;
export const assertNotDatePass: AssertNotPassFunction<Date> = dateGuards.assertNotDatePass;

const validDateGuards = createGuards('valid date', (value): value is Date => isDate(value) && !Number.isNaN(value.getTime()));
export const isValidDate: IsFunction<Date> = validDateGuards.isValidDate;
export const isNotValidDate: IsNotFunction<Date> = validDateGuards.isNotValidDate;
export const assertValidDate: AssertFunction<Date> = validDateGuards.assertValidDate;
export const assertNotValidDate: AssertNotFunction<Date> = validDateGuards.assertNotValidDate;
export const assertValidDatePass: AssertPassFunction<Date> = validDateGuards.assertValidDatePass;
export const assertNotValidDatePass: AssertNotPassFunction<Date> = validDateGuards.assertNotValidDatePass;

const regexpGuards = createInstanceGuards('regexp', RegExp);
export const isRegExp: IsFunction<RegExp> = regexpGuards.isRegexp;
export const isNotRegExp: IsNotFunction<RegExp> = regexpGuards.isNotRegexp;
export const assertRegExp: AssertFunction<RegExp> = regexpGuards.assertRegexp;
export const assertNotRegExp: AssertNotFunction<RegExp> = regexpGuards.assertNotRegexp;
export const assertRegExpPass: AssertPassFunction<RegExp> = regexpGuards.assertRegexpPass;
export const assertNotRegExpPass: AssertNotPassFunction<RegExp> = regexpGuards.assertNotRegexpPass;

const arrayGuards = createGuards('array', (value: any): value is readonly any[] => Array.isArray(value));
export const isArray: <T = any>(value: any) => value is readonly T[] = arrayGuards.isArray;
export const isNotArray: IsNotFunction<readonly any[]> = arrayGuards.isNotArray;
export const assertArray: <T = any>(value: any, message?: AssertionMessage) => asserts value is readonly T[] = arrayGuards.assertArray;
export const assertNotArray: AssertNotFunction<readonly any[]> = arrayGuards.assertNotArray;
export const assertArrayPass: <T = any>(value: any, message?: AssertionMessage) => readonly T[] = arrayGuards.assertArrayPass;
export const assertNotArrayPass: AssertNotPassFunction<readonly any[]> = arrayGuards.assertNotArrayPass;

const writableArrayGuards = createGuards('writable array', (value: any): value is any[] => Array.isArray(value));
export const isWritableArray: <T = any>(value: any) => value is T[] = writableArrayGuards.isWritableArray;
export const isNotWritableArray: IsNotFunction<any[]> = writableArrayGuards.isNotWritableArray;
export const assertWritableArray: <T = any>(value: any, message?: AssertionMessage) => asserts value is T[] = writableArrayGuards.assertWritableArray;
export const assertNotWritableArray: AssertNotFunction<any[]> = writableArrayGuards.assertNotWritableArray;
export const assertWritableArrayPass: <T = any>(value: any, message?: AssertionMessage) => T[] = writableArrayGuards.assertWritableArrayPass;
export const assertNotWritableArrayPass: AssertNotPassFunction<any[]> = writableArrayGuards.assertNotWritableArrayPass;

const blobGuards = createGuards('Blob', (value: any): value is Blob => (supportsBlob && (value instanceof Blob)));
export const isBlob: IsFunction<Blob> = blobGuards.isBlob;
export const isNotBlob: IsNotFunction<Blob> = blobGuards.isNotBlob;
export const assertBlob: AssertFunction<Blob> = blobGuards.assertBlob;
export const assertNotBlob: AssertNotFunction<Blob> = blobGuards.assertNotBlob;
export const assertBlobPass: AssertPassFunction<Blob> = blobGuards.assertBlobPass;
export const assertNotBlobPass: AssertNotPassFunction<Blob> = blobGuards.assertNotBlobPass;

const arrayBufferGuards = createInstanceGuards('ArrayBuffer', ArrayBuffer);
export const isArrayBuffer: IsFunction<ArrayBuffer> = arrayBufferGuards.isArrayBuffer;
export const isNotArrayBuffer: IsNotFunction<ArrayBuffer> = arrayBufferGuards.isNotArrayBuffer;
export const assertArrayBuffer: AssertFunction<ArrayBuffer> = arrayBufferGuards.assertArrayBuffer;
export const assertNotArrayBuffer: AssertNotFunction<ArrayBuffer> = arrayBufferGuards.assertNotArrayBuffer;
export const assertArrayBufferPass: AssertPassFunction<ArrayBuffer> = arrayBufferGuards.assertArrayBufferPass;
export const assertNotArrayBufferPass: AssertNotPassFunction<ArrayBuffer> = arrayBufferGuards.assertNotArrayBufferPass;

const arrayBufferViewGuards = createGuards('ArrayBufferView', (value: any): value is ArrayBufferView => ArrayBuffer.isView(value));
export const isArrayBufferView: IsFunction<ArrayBufferView> = arrayBufferViewGuards.isArrayBufferView;
export const isNotArrayBufferView: IsNotFunction<ArrayBufferView> = arrayBufferViewGuards.isNotArrayBufferView;
export const assertArrayBufferView: AssertFunction<ArrayBufferView> = arrayBufferViewGuards.assertArrayBufferView;
export const assertNotArrayBufferView: AssertNotFunction<ArrayBufferView> = arrayBufferViewGuards.assertNotArrayBufferView;
export const assertArrayBufferViewPass: AssertPassFunction<ArrayBufferView> = arrayBufferViewGuards.assertArrayBufferViewPass;
export const assertNotArrayBufferViewPass: AssertNotPassFunction<ArrayBufferView> = arrayBufferViewGuards.assertNotArrayBufferViewPass;

const binaryDataGuards = createGuards('BinaryData', (value: any): value is BinaryData => (isArrayBuffer(value) || isArrayBufferView(value)));
export const isBinaryData: IsFunction<BinaryData> = binaryDataGuards.isBinaryData;
export const isNotBinaryData: IsNotFunction<BinaryData> = binaryDataGuards.isNotBinaryData;
export const assertBinaryData: AssertFunction<BinaryData> = binaryDataGuards.assertBinaryData;
export const assertNotBinaryData: AssertNotFunction<BinaryData> = binaryDataGuards.assertNotBinaryData;
export const assertBinaryDataPass: AssertPassFunction<BinaryData> = binaryDataGuards.assertBinaryDataPass;
export const assertNotBinaryDataPass: AssertNotPassFunction<BinaryData> = binaryDataGuards.assertNotBinaryDataPass;

const int8ArrayGuards = createInstanceGuards('Int8Array', Int8Array);
export const isInt8Array: IsFunction<Int8Array> = int8ArrayGuards.isInt8Array;
export const isNotInt8Array: IsNotFunction<Int8Array> = int8ArrayGuards.isNotInt8Array;
export const assertInt8Array: AssertFunction<Int8Array> = int8ArrayGuards.assertInt8Array;
export const assertNotInt8Array: AssertNotFunction<Int8Array> = int8ArrayGuards.assertNotInt8Array;
export const assertInt8ArrayPass: AssertPassFunction<Int8Array> = int8ArrayGuards.assertInt8ArrayPass;
export const assertNotInt8ArrayPass: AssertNotPassFunction<Int8Array> = int8ArrayGuards.assertNotInt8ArrayPass;

const uint8ArrayGuards = createInstanceGuards('Uint8Array', Uint8Array);
export const isUint8Array: IsFunction<Uint8Array> = uint8ArrayGuards.isUint8Array;
export const isNotUint8Array: IsNotFunction<Uint8Array> = uint8ArrayGuards.isNotUint8Array;
export const assertUint8Array: AssertFunction<Uint8Array> = uint8ArrayGuards.assertUint8Array;
export const assertNotUint8Array: AssertNotFunction<Uint8Array> = uint8ArrayGuards.assertNotUint8Array;
export const assertUint8ArrayPass: AssertPassFunction<Uint8Array> = uint8ArrayGuards.assertUint8ArrayPass;
export const assertNotUint8ArrayPass: AssertNotPassFunction<Uint8Array> = uint8ArrayGuards.assertNotUint8ArrayPass;

const uint8ClampedArrayGuards = createInstanceGuards('Uint8ClampedArray', Uint8ClampedArray);
export const isUint8ClampedArray: IsFunction<Uint8ClampedArray> = uint8ClampedArrayGuards.isUint8ClampedArray;
export const isNotUint8ClampedArray: IsNotFunction<Uint8ClampedArray> = uint8ClampedArrayGuards.isNotUint8ClampedArray;
export const assertUint8ClampedArray: AssertFunction<Uint8ClampedArray> = uint8ClampedArrayGuards.assertUint8ClampedArray;
export const assertNotUint8ClampedArray: AssertNotFunction<Uint8ClampedArray> = uint8ClampedArrayGuards.assertNotUint8ClampedArray;
export const assertUint8ClampedArrayPass: AssertPassFunction<Uint8ClampedArray> = uint8ClampedArrayGuards.assertUint8ClampedArrayPass;
export const assertNotUint8ClampedArrayPass: AssertNotPassFunction<Uint8ClampedArray> = uint8ClampedArrayGuards.assertNotUint8ClampedArrayPass;

const int16ArrayGuards = createInstanceGuards('Int16Array', Int16Array);
export const isInt16Array: IsFunction<Int16Array> = int16ArrayGuards.isInt16Array;
export const isNotInt16Array: IsNotFunction<Int16Array> = int16ArrayGuards.isNotInt16Array;
export const assertInt16Array: AssertFunction<Int16Array> = int16ArrayGuards.assertInt16Array;
export const assertNotInt16Array: AssertNotFunction<Int16Array> = int16ArrayGuards.assertNotInt16Array;
export const assertInt16ArrayPass: AssertPassFunction<Int16Array> = int16ArrayGuards.assertInt16ArrayPass;
export const assertNotInt16ArrayPass: AssertNotPassFunction<Int16Array> = int16ArrayGuards.assertNotInt16ArrayPass;

const uint16ArrayGuards = createInstanceGuards('Uint16Array', Uint16Array);
export const isUint16Array: IsFunction<Uint16Array> = uint16ArrayGuards.isUint16Array;
export const isNotUint16Array: IsNotFunction<Uint16Array> = uint16ArrayGuards.isNotUint16Array;
export const assertUint16Array: AssertFunction<Uint16Array> = uint16ArrayGuards.assertUint16Array;
export const assertNotUint16Array: AssertNotFunction<Uint16Array> = uint16ArrayGuards.assertNotUint16Array;
export const assertUint16ArrayPass: AssertPassFunction<Uint16Array> = uint16ArrayGuards.assertUint16ArrayPass;
export const assertNotUint16ArrayPass: AssertNotPassFunction<Uint16Array> = uint16ArrayGuards.assertNotUint16ArrayPass;

const int32ArrayGuards = createInstanceGuards('Int32Array', Int32Array);
export const isInt32Array: IsFunction<Int32Array> = int32ArrayGuards.isInt32Array;
export const isNotInt32Array: IsNotFunction<Int32Array> = int32ArrayGuards.isNotInt32Array;
export const assertInt32Array: AssertFunction<Int32Array> = int32ArrayGuards.assertInt32Array;
export const assertNotInt32Array: AssertNotFunction<Int32Array> = int32ArrayGuards.assertNotInt32Array;
export const assertInt32ArrayPass: AssertPassFunction<Int32Array> = int32ArrayGuards.assertInt32ArrayPass;
export const assertNotInt32ArrayPass: AssertNotPassFunction<Int32Array> = int32ArrayGuards.assertNotInt32ArrayPass;

const uint32ArrayGuards = createInstanceGuards('Uint32Array', Uint32Array);
export const isUint32Array: IsFunction<Uint32Array> = uint32ArrayGuards.isUint32Array;
export const isNotUint32Array: IsNotFunction<Uint32Array> = uint32ArrayGuards.isNotUint32Array;
export const assertUint32Array: AssertFunction<Uint32Array> = uint32ArrayGuards.assertUint32Array;
export const assertNotUint32Array: AssertNotFunction<Uint32Array> = uint32ArrayGuards.assertNotUint32Array;
export const assertUint32ArrayPass: AssertPassFunction<Uint32Array> = uint32ArrayGuards.assertUint32ArrayPass;
export const assertNotUint32ArrayPass: AssertNotPassFunction<Uint32Array> = uint32ArrayGuards.assertNotUint32ArrayPass;

const float32ArrayGuards = createInstanceGuards('Float32Array', Float32Array);
export const isFloat32Array: IsFunction<Float32Array> = float32ArrayGuards.isFloat32Array;
export const isNotFloat32Array: IsNotFunction<Float32Array> = float32ArrayGuards.isNotFloat32Array;
export const assertFloat32Array: AssertFunction<Float32Array> = float32ArrayGuards.assertFloat32Array;
export const assertNotFloat32Array: AssertNotFunction<Float32Array> = float32ArrayGuards.assertNotFloat32Array;
export const assertFloat32ArrayPass: AssertPassFunction<Float32Array> = float32ArrayGuards.assertFloat32ArrayPass;
export const assertNotFloat32ArrayPass: AssertNotPassFunction<Float32Array> = float32ArrayGuards.assertNotFloat32ArrayPass;

const float64ArrayGuards = createInstanceGuards('Float64Array', Float64Array);
export const isFloat64Array: IsFunction<Float64Array> = float64ArrayGuards.isFloat64Array;
export const isNotFloat64Array: IsNotFunction<Float64Array> = float64ArrayGuards.isNotFloat64Array;
export const assertFloat64Array: AssertFunction<Float64Array> = float64ArrayGuards.assertFloat64Array;
export const assertNotFloat64Array: AssertNotFunction<Float64Array> = float64ArrayGuards.assertNotFloat64Array;
export const assertFloat64ArrayPass: AssertPassFunction<Float64Array> = float64ArrayGuards.assertFloat64ArrayPass;
export const assertNotFloat64ArrayPass: AssertNotPassFunction<Float64Array> = float64ArrayGuards.assertNotFloat64ArrayPass;

const bigInt64ArrayGuards = createInstanceGuards('BigInt64Array', BigInt64Array);
export const isBigInt64Array: IsFunction<BigInt64Array> = bigInt64ArrayGuards.isBigInt64Array;
export const isNotBigInt64Array: IsNotFunction<BigInt64Array> = bigInt64ArrayGuards.isNotBigInt64Array;
export const assertBigInt64Array: AssertFunction<BigInt64Array> = bigInt64ArrayGuards.assertBigInt64Array;
export const assertNotBigInt64Array: AssertNotFunction<BigInt64Array> = bigInt64ArrayGuards.assertNotBigInt64Array;
export const assertBigInt64ArrayPass: AssertPassFunction<BigInt64Array> = bigInt64ArrayGuards.assertBigInt64ArrayPass;
export const assertNotBigInt64ArrayPass: AssertNotPassFunction<BigInt64Array> = bigInt64ArrayGuards.assertNotBigInt64ArrayPass;

const bigUint64ArrayGuards = createInstanceGuards('BigUint64Array', BigUint64Array);
export const isBigUint64Array: IsFunction<BigUint64Array> = bigUint64ArrayGuards.isBigUint64Array;
export const isNotBigUint64Array: IsNotFunction<BigUint64Array> = bigUint64ArrayGuards.isNotBigUint64Array;
export const assertBigUint64Array: AssertFunction<BigUint64Array> = bigUint64ArrayGuards.assertBigUint64Array;
export const assertNotBigUint64Array: AssertNotFunction<BigUint64Array> = bigUint64ArrayGuards.assertNotBigUint64Array;
export const assertBigUint64ArrayPass: AssertPassFunction<BigUint64Array> = bigUint64ArrayGuards.assertBigUint64ArrayPass;
export const assertNotBigUint64ArrayPass: AssertNotPassFunction<BigUint64Array> = bigUint64ArrayGuards.assertNotBigUint64ArrayPass;

const dataViewGuards = createInstanceGuards('DataView', DataView);
export const isDataView: IsFunction<DataView> = dataViewGuards.isDataView;
export const isNotDataView: IsNotFunction<DataView> = dataViewGuards.isNotDataView;
export const assertDataView: AssertFunction<DataView> = dataViewGuards.assertDataView;
export const assertNotDataView: AssertNotFunction<DataView> = dataViewGuards.assertNotDataView;
export const assertDataViewPass: AssertPassFunction<DataView> = dataViewGuards.assertDataViewPass;
export const assertNotDataViewPass: AssertNotPassFunction<DataView> = dataViewGuards.assertNotDataViewPass;

const typedArrayGuards = createGuards('TypedArray', (value): value is TypedArray => (ArrayBuffer.isView(value) && isNotDataView(value)));
export const isTypedArray: IsFunction<TypedArray> = typedArrayGuards.isTypedArray;
export const isNotTypedArray: IsNotFunction<TypedArray> = typedArrayGuards.isNotTypedArray;
export const assertTypedArray: AssertFunction<TypedArray> = typedArrayGuards.assertTypedArray;
export const assertNotTypedArray: AssertNotFunction<TypedArray> = typedArrayGuards.assertNotTypedArray;
export const assertTypedArrayPass: AssertPassFunction<TypedArray> = typedArrayGuards.assertTypedArrayPass;
export const assertNotTypedArrayPass: AssertNotPassFunction<TypedArray> = typedArrayGuards.assertNotTypedArrayPass;

const setGuards = createInstanceGuards('Set', Set);
export const isSet: IsFunction<Set<any>> = setGuards.isSet;
export const isNotSet: IsNotFunction<Set<any>> = setGuards.isNotSet;
export const assertSet: AssertFunction<Set<any>> = setGuards.assertSet;
export const assertNotSet: AssertNotFunction<Set<any>> = setGuards.assertNotSet;
export const assertSetPass: AssertPassFunction<Set<any>> = setGuards.assertSetPass;
export const assertNotSetPass: AssertNotPassFunction<Set<any>> = setGuards.assertNotSetPass;

const mapGuards = createInstanceGuards('Map', Map);
export const isMap: IsFunction<Map<any, any>> = mapGuards.isMap;
export const isNotMap: IsNotFunction<Map<any, any>> = mapGuards.isNotMap;
export const assertMap: AssertFunction<Map<any, any>> = mapGuards.assertMap;
export const assertNotMap: AssertNotFunction<Map<any, any>> = mapGuards.assertNotMap;
export const assertMapPass: AssertPassFunction<Map<any, any>> = mapGuards.assertMapPass;
export const assertNotMapPass: AssertNotPassFunction<Map<any, any>> = mapGuards.assertNotMapPass;

const promiseGuards = createInstanceGuards('Promise', Promise);
export const isPromise: IsFunction<Promise<any>> = promiseGuards.isPromise;
export const isNotPromise: IsNotFunction<Promise<any>> = promiseGuards.isNotPromise;
export const assertPromise: AssertFunction<Promise<any>> = promiseGuards.assertPromise;
export const assertNotPromise: AssertNotFunction<Promise<any>> = promiseGuards.assertNotPromise;
export const assertPromisePass: AssertPassFunction<Promise<any>> = promiseGuards.assertPromisePass;
export const assertNotPromisePass: AssertNotPassFunction<Promise<any>> = promiseGuards.assertNotPromisePass;

const errorGuards = createInstanceGuards('error', Error);
export const isError: IsFunction<Error> = errorGuards.isError;
export const isNotError: IsNotFunction<Error> = errorGuards.isNotError;
export const assertError: AssertFunction<Error> = errorGuards.assertError;
export const assertNotError: AssertNotFunction<Error> = errorGuards.assertNotError;
export const assertErrorPass: AssertPassFunction<Error> = errorGuards.assertErrorPass;
export const assertNotErrorPass: AssertNotPassFunction<Error> = errorGuards.assertNotErrorPass;

const readableStreamGuards = createGuards('ReadableStream', (value: any): value is ReadableStream => (supportsReadableStream && (value instanceof ReadableStream)));
export const isReadableStream: <T = any>(value: any) => value is ReadableStream<T> = readableStreamGuards.isReadableStream;
export const isNotReadableStream: IsNotFunction<ReadableStream> = readableStreamGuards.isNotReadableStream;
export const assertReadableStream: <T = any>(value: any, message?: AssertionMessage) => asserts value is ReadableStream<T> = readableStreamGuards.assertReadableStream;
export const assertNotReadableStream: AssertNotFunction<ReadableStream> = readableStreamGuards.assertNotReadableStream;
export const assertReadableStreamPass: <T = any>(value: any, message?: AssertionMessage) => ReadableStream<T> = readableStreamGuards.assertReadableStreamPass;
export const assertNotReadableStreamPass: AssertNotPassFunction<ReadableStream> = readableStreamGuards.assertNotReadableStreamPass;
