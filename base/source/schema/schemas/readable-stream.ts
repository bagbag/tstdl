/* eslint-disable @typescript-eslint/naming-convention */

import type { Decorator } from '#/reflection';
import { createSchemaPropertyDecoratorFromSchema } from '../decorators';
import type { Schema } from '../schema';
import type { ValueSchemaOptions } from '../types';
import { valueSchema } from '../types';

export type ReadableStreamOptions = ValueSchemaOptions;

export function readableStream(options?: ReadableStreamOptions): Schema<ReadableStream> {
  return valueSchema(ReadableStream, options);
}

export function ReadableStreamProperty(options?: ReadableStreamOptions): Decorator<'property' | 'accessor'> {
  return createSchemaPropertyDecoratorFromSchema(readableStream(options));
}
