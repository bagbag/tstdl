/* eslint-disable @typescript-eslint/ban-types */

import { wrapLog } from '#/function/log.js';
import type { Decorator } from '#/reflection/types.js';
import { createDecorator } from '#/reflection/utils.js';
import type { AbstractConstructor, Record } from '#/types.js';
import { objectKeys } from '#/utils/object/object.js';
import { isFunction } from '#/utils/type-guards.js';

const wrappedStaticMethods = new WeakMap<AbstractConstructor, Set<PropertyKey>>();
const wrappedInstanceMethods = new WeakMap<AbstractConstructor, Set<PropertyKey>>();

function isWrapped(constructor: AbstractConstructor, property: PropertyKey, isStatic: boolean): boolean {
  return (isStatic ? wrappedStaticMethods : wrappedInstanceMethods).get(constructor)?.has(property) ?? false;
}

function setWrapped(constructor: AbstractConstructor, property: PropertyKey, isStatic: boolean): void {
  const map = isStatic ? wrappedStaticMethods : wrappedInstanceMethods;

  if (!map.has(constructor)) {
    map.set(constructor, new Set());
  }

  map.get(constructor)!.add(property);
}

export function Log(): Decorator<'class' | 'method'> {
  return createDecorator({ class: true, method: true }, (data) => {
    if (data.type == 'method') {
      setWrapped(data.constructor, data.methodKey, data.static);
      return { value: wrapLog(data.descriptor.value as Function) };
    }

    const staticProperties = objectKeys(data.constructor).filter((property) => (property != 'length') && (property != 'name') && (property != 'prototype') && isFunction(data.constructor[property]) && !isWrapped(data.constructor, property, true));
    const instanceProperties = objectKeys(data.prototype).filter((property) => (property != 'constructor') && isFunction(data.prototype[property]) && !isWrapped(data.constructor, property, false));

    for (const property of staticProperties) {
      (data.constructor as Record)[property] = wrapLog((data.constructor as Record)[property] as Function, property);
    }

    for (const property of instanceProperties) {
      (data.prototype as Record)[property] = wrapLog((data.prototype as Record)[property] as Function, property);
    }

    return undefined;
  });
}
