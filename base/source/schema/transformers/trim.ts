/* eslint-disable @typescript-eslint/naming-convention */

import type { Decorator } from '#/reflection/index.js';
import { createSchemaValueTransformerDecorator } from '../decorators/index.js';
import type { TransformResult } from '../types/index.js';
import { SchemaValueTransformer, typeSchema } from '../types/index.js';

export class TrimTransformer extends SchemaValueTransformer<string, string> {
  readonly sourceType = String;

  transform(value: string): TransformResult<string> {
    return value.trim();
  }
}

export function Trim(): Decorator<'property' | 'accessor'> {
  return createSchemaValueTransformerDecorator(new TrimTransformer(), { schema: typeSchema(String) });
}
