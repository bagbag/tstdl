import { clamp, linearInterpolate, randomInt } from '#/utils/math.js';
import { isDefined, isNumber } from '#/utils/type-guards.js';
import type { RandomNumberGeneratorFn } from './number-generator/random-number-generator-function.js';
import { defaultRandomNumberGeneratorFn } from './number-generator/random-number-generator-function.js';

export type RandomSeriesOptions = {
  /**
   * Initial value of series. If [number, number] is provided, a random value in that range is generated. If not provided but {@link RandomSeriesOptions.bounds} are, their values are used.
   */
  initial?: number | [min: number, max: number],

  /**
   * Bounds for generated values. If provided, a regression toward the mean is used.
   * If {@link RandomSeriesOptions.volatility} is to high, bounds may be exceeded.
   */
  bounds?: [lower: number, upper: number],

  /**
   * Exponent to use for regression toward the mean (if bounds are provided). Practical values are in the interval [0.5, 15], depending on {@link RandomSeriesOptions.volatility}.
   * High values have (nearly) no regression inside the most part of the {@link RandomSeriesOptions.bounds}, with exponentially higher regression towards the bounds.
   * Value of 1 has a linear "strength" of regression the further it is from the mean of the bounds.
   * Values < 1 already have a strong regression around the mean with only logarithmically stronger regression toward the edges. This results in the value staying close at the mean.
   */
  regressionExponent?: number,

  /**
   * Relative volatility of the series (ratio of value). Practical values are in the interval (0, 0.25), depending on {@link RandomSeriesOptions.regressionExponent}.
   * You can also provide an Iterator of numbers to represent volatile/dynamic volatility. Passes current value as parameter for {@link Iterator.next}.
   */
  volatility?: number | Iterator<number, any, any>,

  /**
   * Whether volatility is relative to current value or initial value.
   */
  relativeTo?: 'current' | 'initial',

  /**
   * Random number generator to use (useful if seeded generator is used to generate static series for each run).
   */
  generator?: RandomNumberGeneratorFn
};

/**
 * Generator to create random series data like stock charts or measurements over time.
 *
 * @example
 *
 * // very simple: series starting at 1 without bounds
 * randomSeries();
 *
 * // bounded: series between 100 and 200
 * randomSeries({ bounds: [100, 200] });
 *
 * // complex: series between 5 and 50 with dynamic volatility like a stock chart
 * randomSeries({
 *   bounds: [5, 50],
 *   volatility: randomSeries({ bounds: [0.01, 0.2], volatility: 0.2, regressionExponent: 2 }),
 *   relativeTo: 'current',
 *   regressionExponent: 8
 * });
 */
export function* randomSeries({ bounds, initial = bounds ?? 1, volatility = 0.025, relativeTo = 'initial', generator = defaultRandomNumberGeneratorFn, regressionExponent = 10 }: RandomSeriesOptions = {}): Generator<number> {
  const initialValue = isNumber(initial) ? initial : randomInt(initial[0], initial[1]);
  const isRelativeToCurrent = (relativeTo == 'current');
  const hasBounds = isDefined(bounds);
  const min = hasBounds ? bounds[0] : undefined;
  const max = hasBounds ? bounds[1] : undefined;
  const volatilityProvider = isNumber(volatility)
    ? () => volatility
    : (value: number) => volatility.next(value).value as number;

  let value = initialValue;

  while (true) {
    const currentVolatility = volatilityProvider(value);

    let changePercent = currentVolatility * ((0.5 - generator()) * 2);

    if (hasBounds) {
      const normalizedDeltaFromMean = linearInterpolate(value, min!, max!, -1, 1);
      const regressFactor = clamp((Math.abs(normalizedDeltaFromMean) ** regressionExponent) * Math.sign(normalizedDeltaFromMean), -1.5, 1.5);
      changePercent -= currentVolatility * regressFactor;
    }

    yield (value += isRelativeToCurrent ? (value * changePercent) : (initialValue * changePercent));
  }
}
