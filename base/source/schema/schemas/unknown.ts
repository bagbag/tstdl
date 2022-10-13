/* eslint-disable @typescript-eslint/naming-convention */

import type { Decorator } from '#/reflection';
import { createSchemaPropertyDecoratorFromSchema } from '../decorators';
import type { TypeSchema } from '../types';
import { typeSchema } from '../types';

export function unknown(): TypeSchema<unknown> { // eslint-disable-line @typescript-eslint/no-unnecessary-type-arguments
  return typeSchema('any');
}

export function Unknwon(): Decorator<'property' | 'accessor'> {
  return createSchemaPropertyDecoratorFromSchema(unknown());
}
