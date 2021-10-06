import type { Observable } from 'rxjs';
import { map, takeWhile, timer } from 'rxjs';

export type SlowArrayOptions = {
  /**
   * delay before emitting the first array
   */
  delay?: number,

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
  let accumulation: T[] = [];

  return timer(options.delay ?? 0, options.interval).pipe(
    takeWhile(() => accumulation.length < array.length),
    map(() => {
      accumulation = array.slice(0, accumulation.length + options.size);
      return accumulation;
    })
  );
}
