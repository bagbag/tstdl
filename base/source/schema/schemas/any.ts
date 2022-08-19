/* eslint-disable @typescript-eslint/naming-convention */

import type { Decorator } from '#/reflection';
import { createSchemaPropertyDecoratorFromValueType } from '../decorators';
import type { TypeSchema } from '../types';
import { typeSchema } from '../types';

export function any(): TypeSchema<any> { // eslint-disable-line @typescript-eslint/no-unnecessary-type-arguments
  return typeSchema('any');
}

export function Any(): Decorator<'property' | 'accessor'> {
  return createSchemaPropertyDecoratorFromValueType(any());
}
