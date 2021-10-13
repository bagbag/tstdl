/* eslint-disable no-bitwise */
import type { SeededRandomNumberGenerator } from './seeded';

const maxValue = 2 ** 32;

class Mulberry32 implements SeededRandomNumberGenerator {
  private state: number;

  readonly maxValue: number;

  constructor(seed: number) {
    this.state = seed;
    this.maxValue = maxValue;
  }

  nextInt(): number {
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;

    let t = Math.imul(this.state ^ (this.state >>> 15), this.state | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0);
  }

  next(): number {
    return this.nextInt() / maxValue;
  }

  fork(): SeededRandomNumberGenerator {
    return new Mulberry32(this.nextInt());
  }

  clone(): SeededRandomNumberGenerator {
    return new Mulberry32(this.state);
  }
}

/**
 * mulberry32
 *
 * very fast 32 bit random number generator with 32 bit state
 * @param seed 32 bit integer seed
 */
export function mulberry32(seed: number): SeededRandomNumberGenerator {
  return new Mulberry32(seed);
}
