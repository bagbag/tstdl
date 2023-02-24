/* eslint-disable @typescript-eslint/naming-convention */

import type { Decorator } from '#/reflection/index.js';
import { createClassDecorator } from '#/reflection/index.js';
import type { SchemaTypeReflectionData } from './types.js';

export function Class(options: SchemaTypeReflectionData = {}): Decorator<'class'> {
  return createClassDecorator({ data: { schema: options }, mergeData: true });
}
