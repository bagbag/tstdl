/* eslint-disable @typescript-eslint/naming-convention */

import type { Decorator } from '#/reflection';
import { createSchemaPropertyDecoratorFromSchema } from '../decorators';
import type { Schema } from '../schema';
import type { ValueSchemaOptions } from '../types';
import { valueSchema } from '../types';

export type ReadableStreamOptions = ValueSchemaOptions;

export function readableStream(options?: ReadableStreamOptions): Schema<globalThis.ReadableStream> {
  return valueSchema(globalThis.ReadableStream, options);
}

export function ReadableStream(): Decorator<'property' | 'accessor'> {
  return createSchemaPropertyDecoratorFromSchema(readableStream());
}
