import type { Constructor } from '#/types';
import { noop } from '#/utils/noop';
import 'reflect-metadata';
import type { AccessorDecoratorHandler, ClassDecoratorHandler, ConstructorParameterDecoratorHandler, CreateDecoratorOptions, Decorator, DecoratorHandler, MethodDecoratorHandler, MethodParameterDecoratorHandler, ParameterDecoratorHandler, PropertyDecoratorHandler, PropertyOrAccessorDecoratorHandler } from './utils';
import { createAccessorDecorator, createClassDecorator, createConstructorParameterDecorator, createDecorator, createMethodDecorator, createMethodParameterDecorator, createParameterDecorator, createPropertyDecorator, createPropertyOrAccessorDecorator } from './utils';

export function Decorate(handler: DecoratorHandler = noop, options: CreateDecoratorOptions = {}): Decorator {
  return createDecorator(handler, options);
}

export function Class<T extends Constructor = Constructor>(handler: ClassDecoratorHandler<T> = noop, options: CreateDecoratorOptions = {}): ClassDecorator {
  return createClassDecorator(handler, options);
}

export function Property(handler: PropertyDecoratorHandler = noop, options: CreateDecoratorOptions = {}): PropertyDecorator {
  return createPropertyDecorator(handler, options);
}

export function Accessor(handler: AccessorDecoratorHandler = noop, options: CreateDecoratorOptions = {}): MethodDecorator {
  return createAccessorDecorator(handler, options);
}

export function PropertyOrAccessor(handler: PropertyOrAccessorDecoratorHandler = noop, options: CreateDecoratorOptions = {}): PropertyDecorator | MethodDecorator {
  return createPropertyOrAccessorDecorator(handler, options);
}

export function Method(handler: MethodDecoratorHandler = noop, options: CreateDecoratorOptions = {}): MethodDecorator {
  return createMethodDecorator(handler, options);
}

export function Parameter(handler: ParameterDecoratorHandler = noop, options: CreateDecoratorOptions = {}): ParameterDecorator {
  return createParameterDecorator(handler, options);
}

export function ConstructorParameter(handler: ConstructorParameterDecoratorHandler = noop, options: CreateDecoratorOptions = {}): ParameterDecorator {
  return createConstructorParameterDecorator(handler, options);
}

export function MethodParameter(handler: MethodParameterDecoratorHandler = noop, options: CreateDecoratorOptions = {}): ParameterDecorator {
  return createMethodParameterDecorator(handler, options);
}
