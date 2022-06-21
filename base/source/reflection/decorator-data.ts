import type { Constructor } from '#/types';
import { isDefined, isFunction, isNumber, isObject, isUndefined } from '#/utils/type-guards';
import { getConstructor } from './utils';

export type ClassDecoratorData = {
  type: 'class',
  constructor: Constructor,
  prototype: object
};

export type PropertyDecoratorData = {
  type: 'property',
  constructor: Constructor,
  prototype: object,
  static: boolean,
  propertyKey: string | symbol
};

export type AccessorDecoratorData = {
  type: 'accessor',
  constructor: Constructor,
  prototype: object,
  static: boolean,
  propertyKey: string | symbol,
  descriptor: PropertyDescriptor
};

export type PropertyOrAccessorDecoratorData = PropertyDecoratorData | AccessorDecoratorData;

export type MethodDecoratorData = {
  type: 'method',
  constructor: Constructor,
  prototype: object,
  static: boolean,
  methodKey: string | symbol,
  descriptor: PropertyDescriptor
};

export type MethodParameterDecoratorData = {
  type: 'parameter',
  constructor: Constructor,
  prototype: object,
  static: boolean,
  methodKey: string | symbol,
  index: number
};

export type ConstructorParameterDecoratorData = {
  type: 'constructor-parameter',
  constructor: Constructor,
  prototype: object,
  index: number
};

export type ParameterDecoratorData = MethodParameterDecoratorData | ConstructorParameterDecoratorData;

export type DecoratorData = ClassDecoratorData | PropertyDecoratorData | AccessorDecoratorData | MethodDecoratorData | ParameterDecoratorData;

// eslint-disable-next-line max-lines-per-function
export function getDecoratorData(target: object, propertyKey?: string | symbol, descriptorOrParameterIndex?: PropertyDescriptor | number): DecoratorData {
  const constructor = getConstructor(target);
  const prototype = constructor.prototype;
  const isStatic = typeof target == 'function';

  if (isUndefined(propertyKey) && isUndefined(descriptorOrParameterIndex)) {
    return {
      type: 'class',
      constructor,
      prototype
    };
  }
  else if (isDefined(propertyKey) && isUndefined(descriptorOrParameterIndex)) {
    return {
      type: 'property',
      constructor,
      prototype,
      static: isStatic,
      propertyKey
    };
  }
  else if (isDefined(propertyKey) && isObject(descriptorOrParameterIndex) && (isFunction(descriptorOrParameterIndex.get ?? descriptorOrParameterIndex.set))) { // eslint-disable-line @typescript-eslint/unbound-method
    return {
      type: 'accessor',
      constructor,
      prototype,
      static: isStatic,
      propertyKey,
      descriptor: descriptorOrParameterIndex
    };
  }
  else if (isDefined(propertyKey) && isObject(descriptorOrParameterIndex) && isFunction(descriptorOrParameterIndex.value)) {
    return {
      type: 'method',
      constructor,
      prototype,
      static: isStatic,
      methodKey: propertyKey,
      descriptor: descriptorOrParameterIndex
    };
  }
  else if (isDefined(propertyKey) && isNumber(descriptorOrParameterIndex)) {
    return {
      type: 'parameter',
      constructor,
      prototype,
      static: isStatic,
      methodKey: propertyKey,
      index: descriptorOrParameterIndex
    };
  }
  else if (isNumber(descriptorOrParameterIndex)) {
    return {
      type: 'constructor-parameter',
      constructor,
      prototype,
      index: descriptorOrParameterIndex
    };
  }

  throw new Error('unknown type');
}
