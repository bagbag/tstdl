import type { AnyIterable } from '../any-iterable-iterator.js';

export async function drainAsync(iterable: AnyIterable<any>): Promise<void> {
  for await (const _item of iterable) {
    // just drain
  }
}
