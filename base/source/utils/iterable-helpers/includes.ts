import { any } from './any';

export function includes<T>(iterable: Iterable<T>, value: T): boolean {
  return any(iterable, (item) => item == value);
}
