/* eslint-disable no-bitwise */
import type { SeededRandomNumberGenerator } from './seeded';

/**
 * sfc32 - Small Fast Counter
 *
 * fast 32 bit random number generator with 128 bit state
 * @param seed 32 bit integer seed
 */
export function sfc32(seed1: number, seed2: number, seed3: number, seed4: number): SeededRandomNumberGenerator {
  let state1 = seed1;
  let state2 = seed2;
  let state3 = seed3;
  let state4 = seed4;

  function nextInt(): number {
    state1 >>>= 0;
    state2 >>>= 0;
    state3 >>>= 0;
    state4 >>>= 0;

    let t = (state1 + state2) | 0;
    state1 = state2 ^ (state2 >>> 9);
    state2 = state3 + (state3 << 3) | 0;
    state3 = (state3 << 21) | (state3 >>> 11);
    state4 = state4 + 1 | 0;
    t = t + state4 | 0;
    state3 = state3 + t | 0;

    return (t >>> 0);
  }

  function next(): number {
    return nextInt() / (2 ** 32);
  }

  function fork(): SeededRandomNumberGenerator {
    return sfc32(nextInt(), nextInt(), nextInt(), nextInt());
  }

  return {
    maxValue: 2 ** 32,
    nextInt,
    next,
    fork
  };
}
