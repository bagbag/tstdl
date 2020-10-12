export function random(min: number, max: number, integer: boolean = false): number {
  const value = (Math.random() * (max - min)) + min;
  return integer ? Math.round(value) : value;
}

export function average(...values: number[]): number {
  const total = values.reduce((previous, current) => previous + current, 0);
  return total / values.length;
}

export function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function linearInterpolate(value: number, fromLow: number, fromHigh: number, toLow: number, toHigh: number): number {
  const dX0 = value - fromLow;
  const dX = fromHigh - fromLow;
  const dY = toHigh - toLow;
  const y = toLow + (dX0 * (dY / dX));

  return y;
}

export function minmax(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
