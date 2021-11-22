export interface SeededRandomNumberGenerator {
  /**
   * maximum value the generator will generate for {@link nextInt}
   */
  readonly maxValue: number;

  /**
   * generate a random integer between 0 and {@link maxValue}
   * @see maxValue
   */
  nextInt(): number;

  /**
   * generate a random float in interval [0, 1)
   */
  next(): number;

  /**
   * fork the rng based on the current state
   */
  fork(): SeededRandomNumberGenerator;

  /**
   * clone the rng with the current state
   */
  clone(): SeededRandomNumberGenerator;
}
