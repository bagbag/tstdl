/* eslint-disable @typescript-eslint/naming-convention */

import type { Decorator } from '#/reflection';
import { createSchemaPropertyDecorator } from './utils';

export function Nullable(): Decorator<'property' | 'accessor'> {
  return createSchemaPropertyDecorator({ nullable: true });
}
