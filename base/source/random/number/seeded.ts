export interface SeededRandomNumberGenerator {
  /**
   * maximum value the generate will generate for nextInt()
   */
  readonly maxValue: number;

  /**
   * generate a random integer. Maximum value depends on algorithm.
   * @see maxValue
   */
  nextInt(): number;

  /**
   * generate a random float in range [0, 1]
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
