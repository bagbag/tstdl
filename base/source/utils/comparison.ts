import { isNullOrUndefined } from './type-guards.js';
import { typeOf } from './type-of.js';

export function compareByValueSelection<T, C extends string | number>(...selectors: ((item: T) => C)[]): (a: T, b: T) => number {
  return (a: T, b: T) => {
    for (const selector of selectors) {
      const selectedA = selector(a);
      const selectedB = selector(b);
      const comparison = compareByValue(selectedA, selectedB);

      if (comparison != 0) {
        return comparison;
      }
    }

    return 0;
  };
}

export function compareByValueSelectionDescending<T, C extends string | number>(...selectors: ((item: T) => C)[]): (a: T, b: T) => number {
  return (a: T, b: T) => {
    for (const selector of selectors) {
      const selectedA = selector(a);
      const selectedB = selector(b);
      const comparison = compareByValueDescending(selectedA, selectedB);

      if (comparison != 0) {
        return comparison;
      }
    }

    return 0;
  };
}

export function compareByValueSelectionOrdered<T, C extends string | number>(...selectors: (readonly [(item: T) => C, 1 | -1])[]): (a: T, b: T) => number {
  return (a: T, b: T) => {
    for (const [selector, order] of selectors) {
      const selectedA = selector(a);
      const selectedB = selector(b);
      const comparison = (order == 1)
        ? compareByValue(selectedA, selectedB)
        : compareByValueDescending(selectedA, selectedB);

      if (comparison != 0) {
        return comparison;
      }
    }

    return 0;
  };
}

export function compareByValueToOrder<T>(order: T[]): (a: T, b: T) => number {
  return compareByValueSelectionToOrder(order, (item) => item);
}

export const orderRest = Symbol('Order rest');

export function compareByValueSelectionToOrder<T, TSelect>(order: (TSelect | typeof orderRest)[], selector: (item: T) => TSelect): (a: T, b: T) => number {
  const indexMapEntries = order.map((orderItem, index) => [orderItem, index] as const);
  const indexMap = new Map(indexMapEntries);

  return function compareByValueSelectionToOrder(a: T, b: T): number {
    const selectedA = selector(a);
    const selectedB = selector(b);
    const indexA = indexMap.get(selectedA) ?? indexMap.get(orderRest);
    const indexB = indexMap.get(selectedB) ?? indexMap.get(orderRest);

    if (isNullOrUndefined(indexA) || isNullOrUndefined(indexB)) {
      throw new Error('Value not defined in order.');
    }

    return compareByValue(indexA, indexB);
  };
}

export function compareByValue<T>(a: T, b: NoInfer<T>, strict: boolean = true): number {
  if (a === b) {
    return 0;
  }
  else if (a > b) {
    return 1;
  }
  else if (b > a) {
    return -1;
  }

  if (!strict) {
    return 0;
  }

  throw new Error(`Values of type ${typeOf(a)} and ${typeOf(b)} are not comparable.`);
}

export function compareByValueDescending<T>(a: T, b: NoInfer<T>, strict: boolean = true): number {
  if (a === b) {
    return 0;
  }
  else if (a > b) {
    return -1;
  }
  else if (b > a) {
    return 1;
  }

  if (!strict) {
    return 0;
  }

  throw new Error(`Values of type ${typeOf(a)} and ${typeOf(b)} are not comparable.`);
}
