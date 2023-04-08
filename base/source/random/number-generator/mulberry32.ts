/* eslint-disable no-bitwise */
import { SeededRandomNumberGenerator } from './seeded-random-number-generator.js';
import { random32BitSeed } from './utils.js';

const maxValue = (2 ** 32) - 1;
const nextDivisor = 2 ** 32;

export class Mulberry32 extends SeededRandomNumberGenerator {
  private state: number;

  constructor(seed: number) {
    super(maxValue);

    this.state = seed;
  }

  nextInt(): number {
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;

    let t = Math.imul(this.state ^ (this.state >>> 15), this.state | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0);
  }

  next(): number {
    return this.nextInt() / nextDivisor;
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
 * Very fast 32 bit random number generator with 32 bit state
 * @param seed 32 bit integer seed
 */
export function mulberry32(seed: number = random32BitSeed()): SeededRandomNumberGenerator {
  return new Mulberry32(seed);
}
