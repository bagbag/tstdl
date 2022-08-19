/* eslint-disable @typescript-eslint/naming-convention */

import type { Decorator } from '#/reflection';
import { createSchemaValueTransformerDecorator } from '../decorators';
import type { TransformResult } from '../types';
import { SchemaValueTransformer, typeSchema } from '../types';

export class LowercaseTransformer extends SchemaValueTransformer<string, string, string> {
  readonly sourceType = String;
  readonly targetType = String;

  transform(value: string): TransformResult<string> {
    return { success: true, value: value.toLowerCase() };
  }
}

export function Lowercase(): Decorator<'property' | 'accessor'> {
  return createSchemaValueTransformerDecorator(new LowercaseTransformer(), { schema: typeSchema(String) });
}