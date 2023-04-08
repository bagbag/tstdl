import { RandomNumberGenerator } from './random-number-generator.js';

export abstract class SeededRandomNumberGenerator extends RandomNumberGenerator {
  constructor(maxValue: number) {
    super(maxValue);
  }

  /**
   * Fork the rng based on the current state
   */
  abstract fork(): SeededRandomNumberGenerator;

  /**
   * Clone the rng with the current state
   */
  abstract clone(): SeededRandomNumberGenerator;
}
