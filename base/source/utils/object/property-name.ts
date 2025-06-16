import type { DeepFlatten, DeepNonNullable, Record } from '#/types.js';
import { assertString, assertStringPass, isDefined, isUndefined } from '../type-guards.js';

export const propertyName = Symbol('PropertyName');
export const cast = Symbol('cast');

export type PropertyName = { [propertyName]: string };
export type PropertyNameProxy<T extends Record> = { [P in keyof DeepNonNullable<T>]: PropertyNameProxyChild<T[P]> };
export type PropertyNameProxyChild<T> = (T extends Record ? (PropertyNameProxy<T> & PropertyName) : (PropertyName)) & { [cast]<U extends T>(): PropertyNameProxyChild<U> };
export type PropertyNameOfExpressionObject<T> = { [P in keyof T]: PropertyNameOfExpressionObject<DeepNonNullable<T>[P]> & { [cast]<U extends T[P]>(): PropertyNameOfExpressionObject<DeepNonNullable<U>> } };
export type FlatPropertyNameOfExpressionObject<T> = { [P in keyof DeepFlatten<DeepNonNullable<T>>]: FlatPropertyNameOfExpressionObject<DeepFlatten<DeepNonNullable<T>>[P]> & { [cast]<U extends DeepFlatten<DeepNonNullable<T>>[P]>(): FlatPropertyNameOfExpressionObject<DeepNonNullable<U>> } };

export function getPropertyName(name: string): PropertyName {
  return { [propertyName]: name };
}

export function isPropertyName(value: any): value is PropertyName {
  return isDefined((value as PropertyName | undefined)?.[propertyName]);
}

const propertyNameProxy = Symbol('PropertyNameProxy');

/**
 * Get the path to a property
 *
 * @param options.deep Whether to return the whole path to the property or just the last property
 * @param options.flat Ignore array accesses (properties consiting only of numbers)
 * @param options.prefix Name prefix
 *
 * @example
 * import { getPropertyNameProxy, propertyName } from '@tstdl/base/utils/object.js';
 *
 * const name = getPropertyNameProxy<MyType>().foo.bar[propertyName];
 *
 * name == 'foo.bar' // true
 */
export function getPropertyNameProxy<T extends Record = Record>(options: { deep?: boolean, flat?: boolean, prefix?: string } = {}): PropertyNameProxy<T> {
  const { deep = true, flat = false, prefix } = options;

  const cache = new Map<string, PropertyNameProxy<any>>();

  const proxy = new Proxy<PropertyNameProxy<T>>({ [propertyNameProxy]: prefix } as PropertyNameProxy<T>, {
    get: (_target, property): any => {
      if (property == propertyName) {
        return prefix;
      }

      if (property == cast) {
        return () => proxy;
      }

      if (property == 'toString') {
        return () => prefix;
      }

      assertString(property, `Invalid property access on PropertyNameProxy. Property must be a string, but was "${property.toString()}".`);

      const ignore = (flat && (/\d+/u).test(property));

      if (ignore) {
        return proxy;
      }

      const cached = cache.get(property);

      if (isDefined(cached)) {
        return cached;
      }

      const newProxy = getPropertyNameProxy({ deep, flat, prefix: deep ? isUndefined(prefix) ? property : `${prefix}.${property}` : property });
      cache.set(property, newProxy);

      return newProxy;
    }
  });

  return proxy;
}

/**
 * Get the path to a property
 * @param expression Property selection expression
 * @param options.deep Whether to return the whole path to the property or just the last property
 * @returns Property name
 */
export function propertyNameOf<T extends Record = Record>(expression: (instance: PropertyNameOfExpressionObject<T>) => any, options: { deep?: boolean } = {}): string {
  const name = (expression(getPropertyNameProxy<T>({ deep: options.deep, flat: false }) as PropertyNameOfExpressionObject<T>) as (PropertyNameProxyChild<any> | undefined))?.[propertyName];
  return assertStringPass(name, 'invalid expression');
}

/**
 * Get the flat path to a property (flat = ignore array accesses (properties only consisting of numbers))
 * @param expression Property selection expression
 * @param options.deep Whether to return the whole path to the property or just the last property
 * @returns Property name
 */
export function flatPropertyNameOf<T extends Record = Record>(expression: (instance: FlatPropertyNameOfExpressionObject<T>) => any, options: { deep?: boolean } = {}): string {
  const name = (expression(getPropertyNameProxy({ deep: options.deep, flat: true }) as FlatPropertyNameOfExpressionObject<T>) as unknown as (PropertyNameProxyChild<any> | undefined))?.[propertyName];
  return assertStringPass(name, 'invalid expression');
}
