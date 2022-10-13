/* eslint-disable @typescript-eslint/naming-convention */

import type { Decorator } from '#/reflection';
import { createClassDecorator } from '#/reflection';
import type { SchemaTypeReflectionData } from './types';

export function Type(options: SchemaTypeReflectionData = {}): Decorator<'class'> {
  return createClassDecorator({ data: { schema: options }, mergeData: true });
}
