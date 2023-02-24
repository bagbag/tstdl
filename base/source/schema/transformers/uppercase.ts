/* eslint-disable @typescript-eslint/naming-convention */

import type { Decorator } from '#/reflection/index.js';
import { createSchemaValueTransformerDecorator } from '../decorators/index.js';
import type { TransformResult } from '../types/index.js';
import { SchemaValueTransformer, typeSchema } from '../types/index.js';

export class UppercaseTransformer extends SchemaValueTransformer<string, string> {
  readonly sourceType = String;

  transform(value: string): TransformResult<string> {
    return value.toUpperCase();
  }
}

export function Uppercase(): Decorator<'property' | 'accessor'> {
  return createSchemaValueTransformerDecorator(new UppercaseTransformer(), { schema: typeSchema(String) });
}
