import { DetailsError } from '#/error/details.error';
import { isDefined, isFunction, isNumber, isObject, isUndefined } from '#/utils/type-guards';
import type { DecoratorData } from './types';
import { getConstructor } from './utils';

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
      type: 'method-parameter',
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

  throw new DetailsError('unknown type', { type: constructor, isStatic, propertyKey, descriptorOrParameterIndex });
}
