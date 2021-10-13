/* eslint-disable no-bitwise */
import type { SeededRandomNumberGenerator } from './seeded';

const maxValue = 2 ** 32;

export class Sfc32 implements SeededRandomNumberGenerator {
  private state1: number;
  private state2: number;
  private state3: number;
  private state4: number;

  readonly maxValue: number;

  constructor(seed1: number, seed2: number, seed3: number, seed4: number) {
    this.state1 = seed1;
    this.state2 = seed2;
    this.state3 = seed3;
    this.state4 = seed4;

    this.maxValue = maxValue;
  }

  nextInt(): number {
    this.state1 >>>= 0;
    this.state2 >>>= 0;
    this.state3 >>>= 0;
    this.state4 >>>= 0;

    let t = (this.state1 + this.state2) | 0;
    this.state1 = this.state2 ^ (this.state2 >>> 9);
    this.state2 = this.state3 + (this.state3 << 3) | 0;
    this.state3 = (this.state3 << 21) | (this.state3 >>> 11);
    this.state4 = this.state4 + 1 | 0;
    t = t + this.state4 | 0;
    this.state3 = this.state3 + t | 0;

    return (t >>> 0);
  }

  next(): number {
    return this.nextInt() / maxValue;
  }

  fork(): SeededRandomNumberGenerator {
    return new Sfc32(this.nextInt(), this.nextInt(), this.nextInt(), this.nextInt());
  }

  clone(): SeededRandomNumberGenerator {
    return new Sfc32(this.state1, this.state2, this.state3, this.state4);
  }
}

/**
 * sfc32 - Small Fast Counter
 *
 * fast 32 bit random number generator with 128 bit state
 * @param seed 32 bit integer seed
 */
export function sfc32(seed1: number, seed2: number, seed3: number, seed4: number): SeededRandomNumberGenerator {
  return new Sfc32(seed1, seed2, seed3, seed4);
}
