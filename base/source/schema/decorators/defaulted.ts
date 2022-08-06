/* eslint-disable @typescript-eslint/naming-convention */

import type { Decorator } from '#/reflection';
import { defaulted } from '../schemas/defaulted';
import type { MaybeDeferredValueTypes } from '../types';
import { createSchemaPropertyDecoratorFromValueType } from './utils';

export function Defaulted(type: MaybeDeferredValueTypes, defaultValue: any): Decorator<'property' | 'accessor'> {
  return createSchemaPropertyDecoratorFromValueType(defaulted(type, defaultValue));
}
