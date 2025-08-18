import { defaultRandomNumberGeneratorFn, type RandomNumberGeneratorFn } from '#/random/number-generator/random-number-generator-function.js';
import { isNull } from './type-guards.js';

/**
 * Generate a random float in interval [min, max).
 * @param min minimum value
 * @param max maximum value
 * @param generator Random number generator to use, defaults to `Math.random`. Must return a number in interval [0, 1).
 * @returns random number (float)
 */
export function randomFloat(min: number, max: number, generator: RandomNumberGeneratorFn = defaultRandomNumberGeneratorFn): number {
  return linearInterpolateFloat(generator(), min, max);
}

/**
 * Generate a random integer in interval [min, max].
 * @param min minimum value
 * @param max maximum value
 * @param generator random number generator to use, defaults to `Math.random`. Must return a number in interval [0, 1)
 * @returns random number (integer)
 */
export function randomInt(min: number, max: number, generator: RandomNumberGeneratorFn = defaultRandomNumberGeneratorFn): number {
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
    throw new Error('No values provided.');
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
    throw new Error('No values provided.');
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

/**
 *
 * @param t Time in interval [0, 1]
 * @param attenuationExponentStart Sensible values are between 1 (linear attenuation) and ~10 (no attenuation until t = ~0.9, then sharply increasing attenuation)
 * @param attenuationExponentEnd Sensible values are between 1 (linear attenuation) and ~10 (no attenuation until t = ~0.9, then sharply increasing attenuation)
 * @param deadzoneWidthStart Deadzone width to add in front of 0.5. Sensible values are between 0 and 0.5
 * @param deadzoneWidthEnd Deadzone width to add to interval [0.5, 1]. Sensible values are between 0 and 0.5
 * @returns Coefficient in interval [0, 1]
 */
export function getAttenuationCoefficient(t: number, attenuationExponentStart: number | null, attenuationExponentEnd: number | null, deadzoneWidthStart: number = 0, deadzoneWidthEnd: number = 0): number {
  if ((t < 0) || (t > 1)) {
    return 0;
  }

  if (t <= 0.5) {
    if (isNull(attenuationExponentStart)) {
      return 1;
    }

    if (t >= (0.5 - deadzoneWidthStart)) {
      return 1;
    }

    return 1 - (-2 * (t - (0.5 - deadzoneWidthStart)) * (0.5 / (0.5 - deadzoneWidthStart))) ** (attenuationExponentStart ** 1.5);
  }

  if (isNull(attenuationExponentEnd) || (t <= (0.5 + deadzoneWidthEnd))) {
    return 1;
  }

  return 1 - (-2 * (-(t - 1) - (0.5 - deadzoneWidthEnd)) * (0.5 / (0.5 - deadzoneWidthEnd))) ** (attenuationExponentEnd ** 1.5);
}
