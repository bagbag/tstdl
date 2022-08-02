import type { Record, StringMap } from '#/types';
import { clone } from '../clone';
import { isArray, isDate, isDefined, isFunction, isNotNull, isObject, isPrimitive, isRegExp, isString, isWritableArray } from '../type-guards';
import { hasOwnProperty, mapObjectValues } from './object';

export type Decycled<T> = { __type: T } & Record<string>;

/**
 * replaces cycles (circular references) in objects with JSONPath
 * @param value object to decycle
 * @param replacer replace values. Like JSON.stringify(value, *replacer*)
 */
export function decycle<T>(value: T, replacer?: (value: any) => any): Decycled<T>;
export function decycle<T>(_value: T, replacer?: (value: any) => any): Decycled<T> {
  const mapping = new Map<any, string>();

  const replacerFn = isDefined(replacer) ? replacer : (value: unknown) => value;

  function _decycle(__value: any, path: string): any {
    const value = replacerFn(__value);

    if (isPrimitive(value) || isRegExp(value) || isDate(value) || isFunction(value)) {
      return value;
    }

    const mappedPath = mapping.get(value);

    if (isDefined(mappedPath)) {
      return { $ref: mappedPath };
    }

    mapping.set(value, path);

    if (isArray(value)) {
      return value.map((item, index): any => _decycle(item, `${path}[${index}]`)) as any;
    }

    return mapObjectValues(value, (item, key): any => _decycle(item, `${path}['${key as string}']`));
  }

  return _decycle(_value, '$') as Decycled<T>;
}

const recyclePathPattern = /^\$(?:\[(?:(\d+)|'(.*?)')\])*$/u;
const recyclePathPartsPattern = /\[(?:(\d+)|'(.*?)')\]/ug;

/**
 * replaces JSONPath in objects with their reference
 * @param value object to recycle
 */
export function recycle<T = any>(value: Decycled<T>, clone?: boolean): T; // eslint-disable-line @typescript-eslint/no-shadow
export function recycle<T = any>(value: any, clone?: boolean): T; // eslint-disable-line @typescript-eslint/no-shadow, @typescript-eslint/unified-signatures
export function recycle<T = any>(_value: Decycled<T>, _clone: boolean = true): T { // eslint-disable-line max-lines-per-function
  const value = _clone ? clone(_value, true) : _value;

  function deref(ref: string): any {
    const parts = ref.matchAll(recyclePathPartsPattern);

    let target = value;
    for (const [, index, property] of parts) {
      const key = index ?? property;

      if (!hasOwnProperty(target, key!)) {
        throw new Error(`reference ${ref} not found`);
      }

      target = (target as StringMap)[key!];
    }

    return target;
  }

  function getRef(node: any): string | undefined {
    if (isObject(node) && hasOwnProperty<Record>(node, '$ref')) {
      const ref = (node as StringMap)['$ref'];

      if (isString(ref) && recyclePathPattern.test(ref)) {
        return ref;
      }
    }

    return undefined;
  }

  function _recycle(node: any): void {
    if (isWritableArray(node)) {
      for (let i = 0; i < node.length; i++) {
        const ref = getRef(node[i]);

        if (isDefined(ref)) {
          node[i] = deref(ref);
        }
        else {
          _recycle(node[i]);
        }
      }
    }
    else if (isObject(node) && isNotNull(node)) {
      for (const key of Object.keys(node)) {
        const ref = getRef((node as StringMap)[key]);

        if (isDefined(ref)) {
          (node as StringMap)[key] = deref(ref);
        }
        else {
          _recycle((node as StringMap)[key]);
        }
      }
    }
  }

  _recycle(value);
  return value as any as T;
}
