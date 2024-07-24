import { isReadableStream } from '#/utils/type-guards.js';
import { Property, type SchemaPropertyDecorator, type SchemaPropertyDecoratorOptions } from '../decorators/index.js';
import { SimpleSchema, type SimpleSchemaOptions } from './simple.js';

export type ReadableStreamSchemaOptions = SimpleSchemaOptions;

export class ReadableStreamSchema extends SimpleSchema<ReadableStream> {
  constructor(options?: ReadableStreamSchemaOptions) {
    super('ReadableStream', isReadableStream, options);
  }
}

export function readableStream(options?: ReadableStreamSchemaOptions): ReadableStreamSchema {
  return new ReadableStreamSchema(options);
}

export function ReadableStreamProperty(options?: SchemaPropertyDecoratorOptions & ReadableStreamSchemaOptions): SchemaPropertyDecorator {
  return Property(readableStream(options), options);
}
