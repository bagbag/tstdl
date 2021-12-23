export function compareByValueSelection<T>(...selectors: ((item: T) => unknown)[]): (a: T, b: T) => number {
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

export function compareByValueSelectionDescending<T>(...selectors: ((item: T) => unknown)[]): (a: T, b: T) => number {
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

export function compareByValueSelectionOrdered<T>(...selectors: (readonly [(item: T) => unknown, 1 | -1])[]): (a: T, b: T) => number {
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

export function compareByValueSelectionToOrder<T, TSelect>(order: TSelect[], selector: (item: T) => TSelect): (a: T, b: T) => number {
  const indexMapEntries = order.map((orderItem, index) => [orderItem, index] as const);
  const indexMap = new Map(indexMapEntries);

  // eslint-disable-next-line @typescript-eslint/no-shadow
  return function compareByValueSelectionToOrder(a: T, b: T): number {
    const selectedA = selector(a);
    const selectedB = selector(b);
    const indexA = indexMap.get(selectedA);
    const indexB = indexMap.get(selectedB);

    if (indexA == undefined || indexB == undefined) {
      throw new Error('value not defined in order');
    }

    return compareByValue(indexA, indexB);
  };
}

export function compareByValue<T>(a: T, b: T): number {
  if (a === b) {
    return 0;
  }
  else if (a > b) {
    return 1;
  }
  else if (b > a) {
    return -1;
  }

  throw new Error('objects not comparable');
}

export function compareByValueDescending<T>(a: T, b: T): number {
  if (a === b) {
    return 0;
  }
  else if (a > b) {
    return -1;
  }
  else if (b > a) {
    return 1;
  }

  throw new Error('objects not comparable');
}
