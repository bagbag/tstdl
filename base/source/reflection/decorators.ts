/* eslint-disable @typescript-eslint/naming-convention */

import 'reflect-metadata'; // eslint-disable-line import/no-unassigned-import

import type { ConstructorParameterDecorator } from '#/types.js';
import { noop } from '#/utils/noop.js';
import type { Decorator, DecoratorHandler } from './types.js';
import type { CreateDecoratorOptions, SpecificCreateDecoratorOptions } from './utils.js';
import { createAccessorDecorator, createClassDecorator, createConstructorParameterDecorator, createDecorator, createMethodDecorator, createMethodParameterDecorator, createParameterDecorator, createPropertyDecorator, createPropertyOrAccessorDecorator } from './utils.js';

export function Decorate({ handler, ...options }: CreateDecoratorOptions & { handler?: DecoratorHandler } = {}): Decorator {
  return createDecorator(
    {
      ...options,
      class: true,
      property: true,
      accessor: true,
      method: true,
      parameter: true,
      methodParameter: true,
      constructorParameter: true
    },
    handler ?? noop
  );
}

export function Class(options?: SpecificCreateDecoratorOptions<'class'>): ClassDecorator {
  return createClassDecorator(options);
}

export function Property(options?: SpecificCreateDecoratorOptions<'property'>): PropertyDecorator {
  return createPropertyDecorator(options);
}

export function Accessor(options?: SpecificCreateDecoratorOptions<'accessor'>): MethodDecorator {
  return createAccessorDecorator(options);
}

export function PropertyOrAccessor(options?: SpecificCreateDecoratorOptions<'property' | 'accessor'>): Decorator<'property' | 'accessor'> {
  return createPropertyOrAccessorDecorator(options);
}

export function Method(options?: SpecificCreateDecoratorOptions<'method'>): MethodDecorator {
  return createMethodDecorator(options);
}

export function MethodParameter(options?: SpecificCreateDecoratorOptions<'methodParameter'>): ParameterDecorator {
  return createMethodParameterDecorator(options);
}

export function ConstructorParameter(options?: SpecificCreateDecoratorOptions<'constructorParameter'>): ConstructorParameterDecorator {
  return createConstructorParameterDecorator(options);
}

export function Parameter(options?: SpecificCreateDecoratorOptions<'parameter'>): ParameterDecorator & ConstructorParameterDecorator {
  return createParameterDecorator(options);
}
