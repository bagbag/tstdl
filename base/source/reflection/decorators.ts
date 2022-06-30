import { noop } from '#/utils/noop';
import 'reflect-metadata';
import type { Decorator, DecoratorHandler } from './types';
import type { CreateDecoratorOptions, SpecificCreateDecoratorOptions } from './utils';
import { createAccessorDecorator, createClassDecorator, createConstructorParameterDecorator, createDecorator, createMethodDecorator, createMethodParameterDecorator, createParameterDecorator, createPropertyDecorator, createPropertyOrAccessorDecorator } from './utils';

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

export function Parameter(options?: SpecificCreateDecoratorOptions<'parameter'>): ParameterDecorator {
  return createParameterDecorator(options);
}

export function ConstructorParameter(options?: SpecificCreateDecoratorOptions<'constructorParameter'>): ParameterDecorator {
  return createConstructorParameterDecorator(options);
}

export function MethodParameter(options?: SpecificCreateDecoratorOptions<'methodParameter'>): ParameterDecorator {
  return createMethodParameterDecorator(options);
}
