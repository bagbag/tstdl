/* eslint-disable @typescript-eslint/naming-convention */

import type { Decorator } from '#/reflection';
import { createSchemaValueTransformerDecorator } from '../decorators';
import type { TransformResult } from '../types';
import { SchemaValueTransformer, typeSchema } from '../types';

export class UppercaseTransformer extends SchemaValueTransformer<string, string> {
  readonly sourceType = String;

  transform(value: string): TransformResult<string> {
    return value.toUpperCase();
  }
}

export function Uppercase(): Decorator<'property' | 'accessor'> {
  return createSchemaValueTransformerDecorator(new UppercaseTransformer(), { schema: typeSchema(String) });
}
