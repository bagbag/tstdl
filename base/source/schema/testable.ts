import type { AbstractConstructor, Record } from '#/types.js';
import { isFunction } from '#/utils/type-guards.js';
import { Schema, type SchemaTestable } from './schema.js';
import { bigint } from './schemas/bigint.js';
import { boolean } from './schemas/boolean.js';
import { func } from './schemas/function.js';
import { number } from './schemas/number.js';
import { getSchemaFromReflection } from './schemas/object.js';
import { readableStream } from './schemas/readable-stream.js';
import { string } from './schemas/string.js';
import { symbol } from './schemas/symbol.js';
import { uint8Array } from './schemas/uint8-array.js';

export function schemaTestableToSchema<T>(testable: SchemaTestable<T>): Schema<T> {
  if (testable instanceof Schema) {
    return testable;
  }

  switch (testable) {
    case String:
      return string() as Schema<any> as Schema<T>;

    case Number:
      return number() as Schema<any> as Schema<T>;

    case Boolean:
      return boolean() as Schema<any> as Schema<T>;

    case BigInt:
      return bigint() as Schema<any> as Schema<T>;

    case Symbol:
      return symbol() as Schema<any> as Schema<T>;

    case Function as AbstractConstructor:
      return func() as Schema<any> as Schema<T>;

    case Uint8Array as AbstractConstructor:
      return uint8Array() as Schema<any> as Schema<T>;

    case ReadableStream as AbstractConstructor:
      return readableStream() as Schema<any> as Schema<T>;

    default:
      return getSchemaFromReflection(testable as AbstractConstructor<Record>);
  }
}

export function isSchemaTestable(value: any): value is SchemaTestable {
  return (value instanceof Schema) || isFunction(value);
}
