/* eslint-disable @typescript-eslint/naming-convention */

import { createDecorator, type Decorator } from '#/reflection/index.js';
import type { SchemaTypeReflectionData } from './types.js';

export function Description(options: SchemaTypeReflectionData = {}): Decorator<'class' | 'property'> {
  return createDecorator({
    class: true,
    property: true,
    data: { schema: options },
    mergeData: true
  });
}
