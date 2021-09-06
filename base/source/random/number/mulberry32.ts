/* eslint-disable no-bitwise */
import type { SeededRandomNumberGenerator } from './seeded';

const maxValue = 2 ** 32;

/**
 * mulberry32
 *
 * very fast 32 bit random number generator with 32 bit state
 * @param seed 32 bit integer seed
 */
export function mulberry32(seed: number): SeededRandomNumberGenerator {
  let state = seed;

  function nextInt(): number {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;

    let t = Math.imul(state ^ (state >>> 15), state | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0);
  }

  function next(): number {
    return nextInt() / (2 ** 32);
  }

  function fork(): SeededRandomNumberGenerator {
    return mulberry32(nextInt());
  }

  return {
    maxValue,
    nextInt,
    next,
    fork
  };
}
