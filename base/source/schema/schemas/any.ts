/* eslint-disable @typescript-eslint/naming-convention */

import type { Decorator } from '#/reflection';
import { createSchemaPropertyDecoratorFromValueType } from '../decorators';
import type { ValueSchema } from '../types';
import { valueSchema } from '../types';

export function any(): ValueSchema<any> { // eslint-disable-line @typescript-eslint/no-unnecessary-type-arguments
  return valueSchema({ type: 'any' });
}

export function Any(): Decorator<'property' | 'accessor'> {
  return createSchemaPropertyDecoratorFromValueType(any());
}
