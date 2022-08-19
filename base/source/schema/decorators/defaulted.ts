/* eslint-disable @typescript-eslint/naming-convention */

import type { Decorator } from '#/reflection';
import type { OneOrMany } from '#/types';
import { defaulted } from '../schemas/defaulted';
import type { ValueType } from '../types';
import { createSchemaPropertyDecoratorFromValueType } from './utils';

export function Defaulted(type: OneOrMany<ValueType>, defaultValue: any): Decorator<'property' | 'accessor'> {
  return createSchemaPropertyDecoratorFromValueType(defaulted(type, defaultValue));
}
