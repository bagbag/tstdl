import { compareByValue } from './helpers';
import type { Comparator } from './sort';

enum Position {
  Undefined = 0,
  First = 1,
  Last = 2
}

export function binarySearch<T extends TComparator, TComparator>(values: ArrayLike<T>, searchValue: TComparator, comparator: Comparator<TComparator> = compareByValue): number | undefined {
  return _binarySearch(values, searchValue, Position.Undefined, comparator);
}

export function binarySearchFirst<T extends TComparator, TComparator>(values: ArrayLike<T>, searchValue: TComparator, comparator: Comparator<TComparator> = compareByValue): number | undefined {
  return _binarySearch(values, searchValue, Position.First, comparator);
}

export function binarySearchLast<T extends TComparator, TComparator>(values: ArrayLike<T>, searchValue: TComparator, comparator: Comparator<TComparator> = compareByValue): number | undefined {
  return _binarySearch(values, searchValue, Position.Last, comparator);
}

function _binarySearch<T extends TComparator, TComparator>(values: ArrayLike<T>, searchValue: TComparator, position: Position, comparator: Comparator<TComparator>): number | undefined {
  const { index, comparison } = _binarySearchRawIndex(values, searchValue, position, comparator);

  return (comparison == 0)
    ? index
    : undefined;
}

export function binarySearchNearestIndex<T extends TComparator, TComparator>(values: ArrayLike<T>, searchValue: TComparator, comparator: Comparator<TComparator> = compareByValue): number {
  const { index } = _binarySearchRawIndex(values, searchValue, Position.Undefined, comparator);
  return index;
}

export function binarySearchFirstIndexEqualOrLarger<T extends TComparator, TComparator>(values: ArrayLike<T>, searchValue: TComparator, comparator: Comparator<TComparator> = compareByValue): number | undefined {
  const { index, comparison } = _binarySearchRawIndex(values, searchValue, Position.First, comparator);

  if ((index == values.length - 1) && (comparison < 0)) {
    return undefined;
  }

  return index + ((comparison < 0) as unknown as number);
}

export function binarySearchLastIndexEqualOrSmaller<T extends TComparator, TComparator>(values: ArrayLike<T>, searchValue: TComparator, comparator: Comparator<TComparator> = compareByValue): number | undefined {
  const { index, comparison } = _binarySearchRawIndex(values, searchValue, Position.Last, comparator);

  if ((index == 0) && (comparison > 0)) {
    return undefined;
  }

  return (comparison > 0) ? (index - 1) : index;
}

export function binarySearchInsertionIndex<T extends TComparator, TComparator>(values: ArrayLike<T>, searchValue: TComparator, comparator: Comparator<TComparator> = compareByValue): number {
  const { index, comparison } = _binarySearchRawIndex(values, searchValue, Position.Undefined, comparator);
  return index + ((comparison <= 0) as unknown as number);
}

// eslint-disable-next-line max-statements
function _binarySearchRawIndex<T extends TComparator, TComparator>(values: ArrayLike<T>, searchValue: TComparator, position: Position, comparator: Comparator<TComparator>): { index: number, comparison: number } {
  let min = 0;
  let max = values.length - 1;
  let middle = 0;
  let value: T;
  let comparison!: number;

  if (values.length == 0) {
    return { index: 0, comparison: 1 };
  }

  const positionComparator = position == Position.First ? () => (min != middle)
    : (position == Position.Last) ? () => (max != middle)
      : () => false;

  const positionSetter = position == Position.First ? () => (max = middle)
    : (position == Position.Last) ? () => (min = middle)
      : () => { throw new Error('must not happen'); };

  const integer = (position == Position.Last) ? Math.ceil : Math.floor;

  while (min <= max) {
    middle = integer((min + max) / 2);
    value = values[middle];
    comparison = comparator(value, searchValue);

    if (comparison < 0) {
      min = middle + 1;
    }
    else if (comparison > 0) {
      max = middle - 1;
    }
    else if (positionComparator()) {
      positionSetter();
    }
    else if (comparison == 0) {
      break;
    }
  }

  return { index: middle, comparison };
}
