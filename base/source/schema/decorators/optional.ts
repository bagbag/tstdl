/* eslint-disable @typescript-eslint/naming-convention */

import type { Decorator } from '#/reflection';
import type { OneOrMany } from '#/types';
import type { SchemaTestable } from '../schema';
import { createSchemaPropertyDecorator } from './utils';

export function Optional(schema?: OneOrMany<SchemaTestable>): Decorator<'property' | 'accessor'> {
  return createSchemaPropertyDecorator({ schema, optional: true });
}
