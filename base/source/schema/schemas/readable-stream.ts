import type { Decorator } from '#/reflection';
import { createSchemaPropertyDecoratorFromValueType } from '../decorators';
import type { ValueSchema } from '../types';
import { valueSchema } from '../types';

export function readableStream(): ValueSchema<globalThis.ReadableStream> {
  return valueSchema({
    type: globalThis.ReadableStream
  });
}

export function ReadableStream(): Decorator<'property' | 'accessor'> {
  return createSchemaPropertyDecoratorFromValueType(readableStream());
}
