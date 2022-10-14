/* eslint-disable @typescript-eslint/naming-convention */

import type { Decorator } from '#/reflection';
import { createSchemaValueTransformerDecorator } from '../decorators';
import type { TransformResult } from '../types';
import { SchemaValueTransformer, typeSchema } from '../types';

export class TrimTransformer extends SchemaValueTransformer<string, string> {
  readonly sourceType = String;

  transform(value: string): TransformResult<string> {
    return value.trim();
  }
}

export function Trim(): Decorator<'property' | 'accessor'> {
  return createSchemaValueTransformerDecorator(new TrimTransformer(), { schema: typeSchema(String) });
}
