import { isReadableStream } from '#/utils/type-guards.js';
import { PropertySchema, type SchemaPropertyDecorator, type SchemaDecoratorOptions } from '../decorators/index.js';
import { SimpleSchema, type SimpleSchemaOptions } from './simple.js';

export type ReadableStreamSchemaOptions = SimpleSchemaOptions<ReadableStream>;

export class ReadableStreamSchema extends SimpleSchema<ReadableStream> {
  override readonly name = 'ReadableStream';

  constructor(options?: ReadableStreamSchemaOptions) {
    super('ReadableStream', isReadableStream, options);
  }
}

export function readableStream(options?: ReadableStreamSchemaOptions): ReadableStreamSchema {
  return new ReadableStreamSchema(options);
}

export function ReadableStreamProperty(options?: SchemaDecoratorOptions & ReadableStreamSchemaOptions): SchemaPropertyDecorator {
  return PropertySchema((data) => readableStream({ description: data.description, example: data.example, ...options }), options);
}
