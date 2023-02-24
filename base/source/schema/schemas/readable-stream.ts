/* eslint-disable @typescript-eslint/naming-convention */

import type { Decorator } from '#/reflection/index.js';
import { createSchemaPropertyDecoratorFromSchema } from '../decorators/index.js';
import type { Schema } from '../schema.js';
import { valueSchema } from '../types/index.js';
import type { ValueSchemaOptions } from '../types/types.js';

export type ReadableStreamOptions = ValueSchemaOptions;

export function readableStream(options?: ReadableStreamOptions): Schema<ReadableStream> {
  return valueSchema(ReadableStream, options);
}

export function ReadableStreamProperty(options?: ReadableStreamOptions): Decorator<'property' | 'accessor'> {
  return createSchemaPropertyDecoratorFromSchema(readableStream(options));
}
