/* eslint-disable @typescript-eslint/naming-convention */

import type { Decorator } from '#/reflection';
import type { ArrayOptions } from '../schemas/array';
import { array } from '../schemas/array';
import type { DeferrableValueTypes } from '../types';
import { createSchemaPropertyDecoratorFromValueType } from './utils';

export function Array(innerValues: DeferrableValueTypes, options?: ArrayOptions): Decorator<'property' | 'accessor'> {
  return createSchemaPropertyDecoratorFromValueType(array(innerValues, options));
}
