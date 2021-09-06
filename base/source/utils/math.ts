/**
 * generate a random value in interval [0, 1)
 */
export type RandomNumberGenerator = () => number;

const defaultRandomNumberGenerator: RandomNumberGenerator = () => Math.random();

/**
 * generate a random float in interval [min, max)
 * @param min minimum value
 * @param max maximum value
 * @param generator random number generator to use, defaults to Math.random
 * @returns random number (float)
 */
export function random(min: number, max: number, generator: RandomNumberGenerator = defaultRandomNumberGenerator): number {
  return linearInterpolateFloat(generator(), min, max);
}

/**
 * generate a random integer in interval [min, max]
 * @param min minimum value
 * @param max maximum value
 * @param generator random number generator to use, defaults to Math.random
 * @returns random number (integer)
 */
export function randomInt(min: number, max: number, generator: RandomNumberGenerator = defaultRandomNumberGenerator): number {
  return linearInterpolateInt(generator(), min, max);
}

/**
 * calculate the average of all values
 * @param values values to average
 * @returns average
 */
export function average(...values: number[]): number {
  const total = values.reduce((previous, current) => previous + current, 0);
  return total / values.length;
}

/**
 * round number to specified decimals
 * @param value value to round
 * @param decimals number of decimals to round to
 * @returns rounded number
 */
export function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/**
 * linearly interpolate the interval [fromLow, fromHigh] into [toLow, toHigh]
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
 * linearly interpolate [0, 1] into an interval
 * @param value value to interpolate in interval [0, 1]
 * @param low lower bound
 * @param high upper bound
 * @returns interpolated value
 */
export function linearInterpolateFloat(value: number, low: number, high: number): number {
  return ((1 - value) * low) + (value * high);
}

/**
 * linearly interpolate [0, 1] into an interval
 * @param value value to interpolate in interval [0, 1]
 * @param low lower bound
 * @param high upper bound
 * @returns interpolated integer value
 */
export function linearInterpolateInt(value: number, low: number, high: number): number {
  return Math.floor(value * (high - low + 1)) + low;
}

/**
 * clamps a number between two numbers
 * @param value value to clamp
 * @param minimum lower bound
 * @param maximum upper bound
 * @returns clamped value
 */
export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
