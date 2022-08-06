/* eslint-disable @typescript-eslint/naming-convention */

import type { Decorator } from '#/reflection';
import { createSchemaPropertyDecorator } from './utils';

export function Coerce(): Decorator<'property' | 'accessor'> {
  return createSchemaPropertyDecorator({ coerce: true });
}
