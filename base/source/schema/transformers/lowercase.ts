/* eslint-disable @typescript-eslint/naming-convention */

import type { Decorator } from '#/reflection';
import { createSchemaValueTransformerDecorator } from '../decorators';
import type { TransformResult } from '../types';
import { SchemaValueTransformer } from '../types';

export class LowercaseTransformer extends SchemaValueTransformer {
  readonly sourceType = String;
  readonly targetType = String;

  transform(value: string): TransformResult {
    return { success: true, value: value.toLowerCase() };
  }
}

export function Lowercase(): Decorator<'property' | 'accessor'> {
  return createSchemaValueTransformerDecorator(new LowercaseTransformer(), { type: String });
}
