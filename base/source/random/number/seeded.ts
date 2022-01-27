export abstract class SeededRandomNumberGenerator {
  /**
   * maximum value the generator will generate for {@link nextInt}
   */
  readonly maxValue: number;

  constructor(maxValue: number) {
    this.maxValue = maxValue;
  }

  /**
   * generate a random integer between 0 and {@link maxValue}
   * @see maxValue
   */
  abstract nextInt(): number;

  /**
   * generate a random float in interval [0, 1)
   */
  abstract next(): number;

  /**
   * fork the rng based on the current state
   */
  abstract fork(): SeededRandomNumberGenerator;

  /**
   * clone the rng with the current state
   */
  abstract clone(): SeededRandomNumberGenerator;
}
