export abstract class RandomNumberGenerator {
  /**
   * Maximum value the generator will generate for {@link nextInt}
   */
  readonly maxValue: number;

  constructor(maxValue: number) {
    this.maxValue = maxValue;
  }

  /**
   * Generate a random integer between 0 and {@link maxValue}
   */
  abstract nextInt(): number;

  /**
   * Generate a random float in interval [0, 1)
   */
  abstract next(): number;
}
