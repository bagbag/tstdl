/* eslint-disable @typescript-eslint/ban-types */

import { wrapLog } from '#/function/log.js';
import { reflectionRegistry } from '#/reflection/registry.js';
import type { Decorator } from '#/reflection/types.js';
import { createDecorator } from '#/reflection/utils.js';
import type { Record } from '#/types.js';
import { objectKeys } from '#/utils/object/object.js';
import { isFunction } from '#/utils/type-guards.js';

const logWrapped = Symbol('logged wrapped');

export function Log(): Decorator<'class' | 'method'> {
  return createDecorator({ class: true, method: true }, (data, metadata) => {
    if (metadata.data.has(logWrapped)) {
      return undefined;
    }

    metadata.data.set(logWrapped, true);

    if (data.type == 'method') {
      return { value: wrapLog(data.descriptor.value as Function) };
    }

    const staticProperties = objectKeys(data.constructor).filter((property) => (property != 'length') && (property != 'name') && (property != 'prototype') && isFunction(data.constructor[property]) && !(reflectionRegistry.getMetadata(data.constructor)?.staticMethods.get(property)?.data.has(logWrapped) ?? false));
    const instanceProperties = objectKeys(data.prototype).filter((property) => (property != 'constructor') && isFunction(data.prototype[property]) && !(reflectionRegistry.getMetadata(data.constructor)?.methods.get(property)?.data.has(logWrapped) ?? false));

    for (const property of staticProperties) {
      (data.constructor as Record)[property] = wrapLog((data.constructor as Record)[property] as Function, property);
    }

    for (const property of instanceProperties) {
      (data.prototype as Record)[property] = wrapLog((data.prototype as Record)[property] as Function, property);
    }

    return undefined;
  });
}
