/**
 * get a random number
 * @param min minimum value - inclusive
 * @param max maximum value - inclusive
 * @param integer return integers (whole numbers) only
 * @returns random number
 */
export function random(min: number, max: number, integer: boolean = false): number {
  const value = (Math.random() * (max - min)) + min;
  return integer ? Math.round(value) : value;
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
 * linearly interpolate a range into another
 * @param value value to interpolate
 * @param fromLow source lower bound
 * @param fromHigh source upper bound
 * @param toLow target lower bound
 * @param toHigh target upper bound
 * @returns interpolated value
 */
export function linearInterpolate(value: number, fromLow: number, fromHigh: number, toLow: number, toHigh: number): number {
  const sourceOffset = value - fromLow;
  const sourceSize = fromHigh - fromLow;
  const targetSize = toHigh - toLow;
  const quotient = targetSize / sourceSize;
  const targetOffset = sourceOffset * quotient;
  const interpolated = toLow + targetOffset;

  return interpolated;
}

/**
 * clamps a number between two numbers
 * @param value value to clamp
 * @param minimum lower bound
 * @param maximum upper bound
 * @returns clamped value
 */
export function minmax(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
