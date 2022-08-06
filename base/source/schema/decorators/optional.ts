/* eslint-disable @typescript-eslint/naming-convention */

import type { Decorator } from '#/reflection';
import { createSchemaPropertyDecorator } from './utils';

export function Optional(): Decorator<'property' | 'accessor'> {
  return createSchemaPropertyDecorator({ optional: true });
}
