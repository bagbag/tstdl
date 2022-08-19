/* eslint-disable @typescript-eslint/naming-convention */

import type { Decorator } from '#/reflection';
import type { OneOrMany } from '#/types';
import type { ArrayOptions } from '../schemas/array';
import { array } from '../schemas/array';
import type { ValueType } from '../types';
import { createSchemaPropertyDecoratorFromValueType } from './utils';

export function Array(innerValues: OneOrMany<ValueType>, options?: ArrayOptions): Decorator<'property' | 'accessor'> {
  return createSchemaPropertyDecoratorFromValueType(array(innerValues, options));
}
