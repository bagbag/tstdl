/* eslint-disable @typescript-eslint/naming-convention */

import { createPropertyOrAccessorDecorator } from '#/reflection/index.js';
import { filterUndefinedObjectProperties } from '#/utils/object/object.js';
import type { SchemaPropertyDecorator, SchemaPropertyReflectionData } from './types.js';

export function createSchemaPropertyDecorator(data: SchemaPropertyReflectionData = {}): SchemaPropertyDecorator {
  return createPropertyOrAccessorDecorator({
    data: { schema: filterUndefinedObjectProperties(data) },
    mergeData: true
  });
}
