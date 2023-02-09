import { randomInt } from '../math';
import { isArray, isDefined } from '../type-guards';

/**
 * Returns value as is, if it is an array, otherwise puts the single value into an array.
 */
export function toArray<T>(value: T | T[]): T[];
export function toArray<T>(value: T | readonly T[]): readonly T[];
export function toArray<T>(value: T | T[] | readonly T[]): readonly T[] {
  return isArray(value) ? value : [value] as T[];
}

/**
 * Return copy of value, if it is an array, otherwise puts the single value into an array.
 */
export function toArrayCopy<T>(value: T | T[] | readonly T[]): T[] {
  return isArray(value) ? [...value] : [value] as T[];
}

/**
 * Returns element of value at index 0, if it is an array and has exactly one element, otherweise returns value as is.
 */
export function extractValueOfArrayIfSingleElement<T>(value: T | T[]): T | T[];
export function extractValueOfArrayIfSingleElement<T>(value: T | readonly T[]): T | readonly T[];
export function extractValueOfArrayIfSingleElement<T>(value: T | T[] | readonly T[]): T | readonly T[] {
  if (isArray(value) && (value.length == 1)) {
    return value[0]!;
  }

  return value;
}

/**
 * creates a new array of specified length and fills it with values from the specified value provider function
 * @param length length of the new array
 * @param valueProvider provider function for the array values
 * @returns created array
 */
export function createArray<T>(length: number, valueProvider: (index: number) => T): T[] {
  const array = [];

  for (let i = 0; i < length; i++) {
    array.push(valueProvider(i));
  }

  return array;
}

/**
 * shuffles items using "The modern version of the Fisher–Yates shuffle"
 * @param items items to shuffle
 * @returns shuffled items
 */
export function shuffle<T>(items: readonly T[]): T[] {
  const cloned = [...items];

  for (let i = 0; i < cloned.length; i++) {
    const j = randomInt(i, cloned.length - 1);
    [cloned[i], cloned[j]] = [cloned[j]!, cloned[i]!];
  }

  return cloned;
}

/**
 * picks a random item from specified array
 * @param array array to pick random item from
 * @param options options
 * @returns random item
 */
export function randomItem<T>(array: readonly T[], { min, max }: { min?: number, max?: number } = {}): T {
  const _min = isDefined(min) ? Math.max(min, 0) : 0;
  const _max = isDefined(max) ? Math.min(max, array.length - 1) : array.length - 1;
  const index = randomInt(_min, _max);

  return array[index]!;
}

/**
 * picks random items from specified array
 * @param array array to pick random items from
 * @param count count of items to pick
 * @param allowDuplicates allow picking an item multiple times - required when count is larger than array length
 * @returns random items
 */
export function randomItems<T>(array: readonly T[], count: number, allowDuplicates: boolean = false): T[] {
  if (allowDuplicates) {
    return createArray(count, () => array[randomInt(0, array.length - 1)]!);
  }

  if (count > array.length) {
    throw new Error('count larger than length of array without allowing duplicates');
  }

  if (count >= (array.length / 2)) {
    return shuffle(array).slice(0, count);
  }

  const taken = new Set<number>();

  return createArray<T>(count, () => {
    while (true) {
      const index = randomInt(0, array.length - 1);

      if (!taken.has(index)) {
        taken.add(index);
        return array[index]!;
      }
    }
  });
}
