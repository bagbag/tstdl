import { NotSupportedError } from '#/error/not-supported.error';

/**
 * Generates a random value in interval [0, 1).
 */
export type RandomNumberGenerator = () => number;

const defaultRandomNumberGenerator: RandomNumberGenerator = () => Math.random();

/**
 * Generate a random float in interval [min, max).
 * @param min minimum value
 * @param max maximum value
 * @param generator Random number generator to use, defaults to `Math.random`. Must return a number in interval [0, 1).
 * @returns random number (float)
 */
export function randomFloat(min: number, max: number, generator: RandomNumberGenerator = defaultRandomNumberGenerator): number {
  return linearInterpolateFloat(generator(), min, max);
}

/**
 * Generate a random integer in interval [min, max].
 * @param min minimum value
 * @param max maximum value
 * @param generator random number generator to use, defaults to `Math.random`. Must return a number in interval [0, 1)
 * @returns random number (integer)
 */
export function randomInt(min: number, max: number, generator: RandomNumberGenerator = defaultRandomNumberGenerator): number {
  return Math.floor(linearInterpolateFloat(generator(), min, max + 1));
}

/**
 * Calculate the sum of all values.
 * @param values values to sum
 * @returns sum
 */
export function sum(values: number[]): number {
  return values.reduce((previous, current) => previous + current, 0);
}

/**
 * Calculate the average of all values.
 * @param values values to average
 * @returns average
 */
export function average(values: number[]): number {
  return sum(values) / values.length;
}

/**
 * Calculate the minimum value.
 * @param values values to get minimum from
 * @returns minimum
 */
export function minimum(values: number[]): number {
  if (values.length == 0) {
    throw new NotSupportedError('No values provided.');
  }

  return values.reduce((previous, current) => Math.min(previous, current), Number.POSITIVE_INFINITY);
}

/**
 * Calculate the maximum value.
 * @param values values to get maximum from
 * @returns maximum
 */
export function maximum(values: number[]): number {
  if (values.length == 0) {
    throw new NotSupportedError('No values provided.');
  }

  return values.reduce((previous, current) => Math.max(previous, current), Number.NEGATIVE_INFINITY);
}

/**
 * Round number to specified decimals.
 * @param value value to round
 * @param decimals number of decimals to round to
 * @returns rounded number
 */
export function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/**
 * Linearly interpolate the interval [fromLow, fromHigh] into [toLow, toHigh].
 * @param value value to interpolate
 * @param fromLow source lower bound
 * @param fromHigh source upper bound
 * @param toLow target lower bound
 * @param toHigh target upper bound
 * @returns interpolated value
 */
export function linearInterpolate(value: number, fromLow: number, fromHigh: number, toLow: number, toHigh: number): number {
  return toLow + ((value - fromLow) * (toHigh - toLow) / (fromHigh - fromLow));
}

/**
 * Linearly interpolate [0, 1] into an interval.
 * @param value value to interpolate in interval [0, 1]
 * @param low lower bound
 * @param high upper bound
 * @returns interpolated value
 */
export function linearInterpolateFloat(value: number, low: number, high: number): number {
  return ((1 - value) * low) + (value * high);
}

/**
 * Clamps a number between two numbers.
 * @param value value to clamp
 * @param minimum lower bound
 * @param maximum upper bound
 * @returns clamped value
 */
export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

/**
 * Calculates the nth-root of a number.
 *
 * Warning: negative values are handled as if they were positive but returned with an negative sign.
 * @param base base
 * @param root root
 * @returns nth-root of base
 */
export function nthRoot(base: number, root: number): number {
  return (base < 0) ? -((-base) ** (1 / root)) : (base ** (1 / root));
}
