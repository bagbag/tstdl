import type { Observable } from 'rxjs';
import { map, of, switchMap, takeWhile, timer } from 'rxjs';

export type SlowArrayOptions = {
  /**
   * delay before emitting the first array
   */
  delay?: number,

  /**
   * initial emitted array size
   */
  initialSize?: number,

  /**
   * interval between each addition of more items
   */
  interval: number,

  /**
   * how many items to add each interval
   */
  size: number
};

/**
 * emits arrays
 * @param array array to take items from
 * @param options options
 */
export function slowArray<T>(array: T[], options: SlowArrayOptions): Observable<T[]> {
  return persistentSlowArray(of(array), options);
}

/**
 * emits arrays - keeping length when changing source array
 * @param array array observable to take items from
 * @param options options
 */
export function persistentSlowArray<T>(array$: Observable<T[]>, options: SlowArrayOptions): Observable<T[]> {
  let accumulation: T[] = [];

  return array$.pipe(
    switchMap((array, index) => timer((index == 0) ? options.delay ?? 0 : 0, options.interval).pipe(
      takeWhile(() => accumulation.length < array.length),
      map(() => {
        accumulation = array.slice(0, Math.min(1, options.initialSize ?? 1, accumulation.length + options.size));
        return accumulation;
      })
    ))
  );
}
