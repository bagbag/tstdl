/* eslint-disable @typescript-eslint/ban-types */

import type { BinaryData, Record } from '#/types';
import { toArray } from './array';
import { toUint8Array } from './binary';
import { compareByValue } from './comparison';
import { sort } from './iterable-helpers';
import type { Comparator } from './sort';
import { isDefined } from './type-guards';

const defaultArrayEqualsComparator = (a: unknown, b: unknown): boolean => a === b;

type ArrayEqualsComparator<A, B> = (a: A, b: B) => boolean;

type ArrayEqualsOptions<A, B> = {
  sort?: Comparator<A | B>,
  comparator?: ArrayEqualsComparator<A, B>
};

export function arrayEquals<A, B>(a: readonly A[], b: readonly B[], options?: ArrayEqualsOptions<A, B>): boolean {
  const _sort = options?.sort ?? false;
  const comparator = options?.comparator ?? defaultArrayEqualsComparator;

  if (a.length != b.length) {
    return false;
  }

  const c = _sort != false ? toArray(sort(a, _sort)) : a;
  const d = _sort != false ? toArray(sort(b, _sort)) : b;

  for (let i = 0; i < c.length; i++) {
    const itemEquals = comparator(c[i]!, d[i]!);

    if (!itemEquals) {
      return false;
    }
  }

  return true;
}

export type EqualsOptions = {
  deep?: boolean,
  arrayDeep?: boolean,
  sortArray?: boolean,
  coerceStrings?: boolean
};

const allowedEqualsCoerceStringsTypes = ['string', 'number', 'boolean', 'bigint'];

export function equals(a: any, b: any, options?: EqualsOptions): boolean;
export function equals(a: any, b: any, options?: EqualsOptions, __internal?: any): boolean; // eslint-disable-line @typescript-eslint/unified-signatures
export function equals(a: any, b: any, options: EqualsOptions = {}, visitedNodes: Set<any> = new Set()): boolean { // eslint-disable-line max-statements, complexity, max-lines-per-function
  if (a === b) {
    return true;
  }

  const aType = typeof a;
  const bType = typeof b;

  if (aType != bType) {
    if (isDefined(options.coerceStrings) && allowedEqualsCoerceStringsTypes.includes(aType) && allowedEqualsCoerceStringsTypes.includes(bType)) {
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      return (a as object).toString() == (b as object).toString();
    }

    return false;
  }

  switch (aType) {
    case 'function':
      return (options.deep == true)
        ? (a as Function).toString() == (b as Function).toString()
        : false;

    case 'object':
      if (a === null || b === null) { // hasn't passed equals check at top, so one must be a true object
        return false;
      }

      if (visitedNodes.has(a)) {
        return true;
      }

      visitedNodes.add(a);

      const aPrototype = Object.getPrototypeOf(a);
      const bPrototype = Object.getPrototypeOf(b);

      if (aPrototype !== bPrototype) {
        return false;
      }

      if (Array.isArray(a)) {
        return (options.arrayDeep != false && (options.deep == true || options.arrayDeep == true))
          ? arrayEquals(a, b as any[], { sort: (options.sortArray == true) ? compareByValue : undefined, comparator: (x, y) => equals(x, y, options, visitedNodes) })
          : a === b;
      }

      if (aPrototype != Object.prototype && aPrototype !== null) { // checking a is enough, because b must have equal prototype (checked above)
        throw new Error('equals only supports plain objects, arrays and primitives');
      }

      if (options.deep == false) {
        return false;
      }

      return objectEquals(a as Record, b as Record, options, visitedNodes);

    default:
      return a === b;
  }
}

// eslint-disable-next-line max-statements, max-lines-per-function
function objectEquals(a: Record<string, unknown>, b: Record<string, unknown>, options: EqualsOptions, visitedNodes: Set<any>): boolean {
  const aProperties = Object.getOwnPropertyNames(a);
  const bProperties = Object.getOwnPropertyNames(b);

  if (!arrayEquals(aProperties, bProperties, { sort: compareByValue })) {
    return false;
  }

  for (const property of aProperties) {
    const eq = equals(a[property], b[property], options, visitedNodes);

    if (!eq) {
      return false;
    }
  }

  return true;
}

/**
 * compares to binary types for equal content
 */
export function binaryEquals(bufferA: BinaryData, bufferB: BinaryData): boolean {
  const a = toUint8Array(bufferA, false);
  const b = toUint8Array(bufferB, false);

  if (a.length != b.length) {
    return false;
  }

  for (let i = 0; i < a.length; i++) {
    if (a[i] != b[i]) {
      return false;
    }
  }

  return true;
}
