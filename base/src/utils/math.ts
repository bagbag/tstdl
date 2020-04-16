export function random(min: number, max: number, integer: boolean = false): number {
  const value = (Math.random() * (max - min)) + min;
  return integer ? Math.round(value) : value;
}

export function average(...values: number[]): number {
  const total = values.reduce((previous, current) => previous + current, 0);
  return total / values.length;
}

export function precisionRound(value: number, precision: number): number {
  const factor = 10 ** precision;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}
