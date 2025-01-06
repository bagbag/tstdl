import { map, type MonoTypeOperatorFunction, type Observable, of, switchMap, takeWhile, timer } from 'rxjs';

export type SlowArrayOptions = {
  /**
   * Delay before emitting the first array
   */
  delay?: number,

  /**
   * Initial emitted array size
   */
  initialSize?: number,

  /**
   * Interval between each addition of more items
   */
  interval: number,

  /**
   * How many items to add each interval
   */
  size: number
};

/**
 * Emits arrays
 * @param array array to take items from
 * @param options options
 */
export function slowArray<T>(array: T[], options: SlowArrayOptions): Observable<T[]> {
  return of(array).pipe(persistentSlowArray(options));
}

/**
 * Emits arrays - keeping length when changing source array
 * @param array array observable to take items from
 * @param options options
 */
export function persistentSlowArray<T>(options: SlowArrayOptions): MonoTypeOperatorFunction<T[]> {
  return (source: Observable<T[]>) => {
    let accumulation: T[] = [];

    const observable = source.pipe(
      switchMap((array, index) => timer((index == 0) ? options.delay ?? 0 : 0, options.interval).pipe(
        takeWhile((_, takeIndex) => (takeIndex == 0) || (accumulation.length < array.length)),
        map(() => {
          accumulation = array.slice(0, Math.max(1, options.initialSize ?? 1, accumulation.length + options.size));
          return accumulation;
        })
      ))
    );

    return observable;
  };
}
