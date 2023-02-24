/* eslint-disable @typescript-eslint/naming-convention */

import type { Decorator } from '#/reflection/index.js';
import { createSchemaPropertyDecorator } from './utils.js';

export function Coerce(): Decorator<'property' | 'accessor'> {
  return createSchemaPropertyDecorator({ coerce: true });
}
