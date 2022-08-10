/* eslint-disable @typescript-eslint/naming-convention */

import type { Decorator } from '#/reflection';
import { createSchemaPropertyDecoratorFromValueType } from '../decorators';
import type { ValueSchema } from '../types';
import { valueSchema } from '../types';

export function unknown(): ValueSchema<unknown> { // eslint-disable-line @typescript-eslint/no-unnecessary-type-arguments
  return valueSchema({ type: 'any' });
}

export function Unknwon(): Decorator<'property' | 'accessor'> {
  return createSchemaPropertyDecoratorFromValueType(unknown());
}
