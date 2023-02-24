import { compareByValue } from './comparison.js';

export type Comparator<T> = (a: T, b: T) => number;
export type AsyncComparator<T> = (a: T, b: T) => number | Promise<number>;

export function quickSort<T>(array: T[], comparator?: Comparator<T>, left?: number, right?: number): T[] {
  const copy = [...array];
  quickSortInPlace(copy, comparator, left, right);

  return copy;
}

export async function quickSortAsync<T>(array: T[], comparator?: AsyncComparator<T>, left?: number, right?: number): Promise<T[]> {
  const copy = [...array];
  await quickSortInPlaceAsync(copy, comparator, left, right);

  return copy;
}

export function quickSortInPlace<T>(array: T[], comparator: Comparator<T> = compareByValue, left: number = 0, right: number = (array.length - 1)): void {
  let pivot: number;
  let partitionIndex: number;

  if (left < right) {
    pivot = right;
    partitionIndex = partition(array, comparator, pivot, left, right);

    quickSortInPlace(array, comparator, left, partitionIndex - 1);
    quickSortInPlace(array, comparator, partitionIndex + 1, right);
  }
}

export async function quickSortInPlaceAsync<T>(array: T[], comparator: AsyncComparator<T> = compareByValue, left: number = 0, right: number = (array.length - 1)): Promise<void> {
  let pivot: number;
  let partitionIndex: number;

  if (left < right) {
    pivot = right;
    partitionIndex = await partitionAsync(array, comparator, pivot, left, right);

    await quickSortInPlaceAsync(array, comparator, left, partitionIndex - 1);
    await quickSortInPlaceAsync(array, comparator, partitionIndex + 1, right);
  }
}

function partition<T>(array: T[], comparator: Comparator<T>, pivot: number, left: number, right: number): number {
  const pivotValue = array[pivot]!;
  let partitionIndex = left;

  for (let i = left; i < right; i++) {
    const comparison = comparator(array[i]!, pivotValue);

    if (comparison < 0) {
      swap(array, i, partitionIndex);
      partitionIndex++;
    }
  }

  swap(array, right, partitionIndex);

  return partitionIndex;
}

async function partitionAsync<T>(array: T[], comparator: AsyncComparator<T>, pivot: number, left: number, right: number): Promise<number> {
  const pivotValue = array[pivot]!;
  let partitionIndex = left;

  for (let i = left; i < right; i++) {
    const comparisonReturnValue = comparator(array[i]!, pivotValue);

    const comparison = (typeof comparisonReturnValue == 'number')
      ? comparisonReturnValue
      : await comparisonReturnValue;

    if (comparison < 0) {
      swap(array, i, partitionIndex);
      partitionIndex++;
    }
  }

  swap(array, right, partitionIndex);

  return partitionIndex;
}

function swap(array: any[], i: number, j: number): void {
  const temp = array[i];
  array[i] = array[j];
  array[j] = temp;
}
