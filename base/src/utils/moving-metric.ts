import { Timer } from './timer';

export enum MetricAggregation {
  Sum,
  Mean,
  Median,
  Minimum,
  Maximum,
  Count,
  Quantile,
  Rate,
  RateBySum
}

export type MetricAggregationOptions<T extends MetricAggregation> = T extends MetricAggregation.Quantile
  ? { scalar: number }
  : never;

type Sample = [number, Timer];

export class MovingMetric {
  private readonly interval: number;
  private readonly samples: Sample[];

  constructor(interval: number) {
    this.interval = interval;
    this.samples = [];
  }

  add(value: number): void {
    const timer = new Timer(true);
    const sample = [value, timer] as Sample;

    this.samples.push(sample);
  }

  aggregate<T extends MetricAggregation>(aggregation: T, options?: MetricAggregationOptions<T>): number {
    switch (aggregation) {
      case MetricAggregation.Sum: return this.sum();
      case MetricAggregation.Mean: return this.mean();
      case MetricAggregation.Median: return this.median();
      case MetricAggregation.Minimum: return this.minimum();
      case MetricAggregation.Maximum: return this.maximum();
      case MetricAggregation.Count: return this.count();
      case MetricAggregation.Quantile:
        if (options == undefined) {
          throw new Error('quantile requires scalar parameter to be provided');
        }

        return this.quantile(options.scalar);

      case MetricAggregation.Rate: return this.rate();
      case MetricAggregation.RateBySum: return this.rateBySum();
      default: throw new Error('unknown aggregation');
    }
  }

  sum(skipRemoveOldSamples: boolean = false): number {
    if (!skipRemoveOldSamples) {
      this.removeOld();
    }

    if (this.samples.length == 0) {
      return NaN;
    }

    return this.samples.reduce((sum, [value]) => sum + value, 0);
  }

  mean(): number {
    this.removeOld();

    if (this.samples.length == 0) {
      return NaN;
    }

    return this.sum(true) / this.samples.length;
  }

  // eslint-disable-next-line max-statements
  median(): number {
    this.removeOld();

    if (this.samples.length == 0) {
      return NaN;
    }

    if (this.samples.length == 1) {
      return this.samples[0][0];
    }

    const sortedSamples = this.sortedByValue();

    if (sortedSamples.length % 2 == 1) {
      const index = (sortedSamples.length - 1) / 2;
      return sortedSamples[index][0];
    }

    const upperIndex = sortedSamples.length / 2;
    const [lower] = sortedSamples[upperIndex - 1];
    const [upper] = sortedSamples[upperIndex];

    return (lower + upper) / 2;
  }

  minimum(): number {
    this.removeOld();

    if (this.samples.length == 0) {
      return NaN;
    }

    return this.samples.reduce((minimum, [value]) => Math.min(minimum, value), Number.MAX_VALUE);
  }

  maximum(): number {
    this.removeOld();

    if (this.samples.length == 0) {
      return NaN;
    }

    return this.samples.reduce((maximum, [value]) => Math.max(maximum, value), Number.MIN_VALUE);
  }

  count(): number {
    this.removeOld();
    return this.samples.length;
  }

  // eslint-disable-next-line max-statements
  quantile(scalar: number): number {
    this.removeOld();

    if (this.samples.length == 0) {
      return NaN;
    }

    const sortedSamples = this.sortedByValue();
    const index = Math.round((sortedSamples.length - 1) * scalar);

    if (Number.isInteger(index)) {
      const [value] = sortedSamples[index];
      return value;
    }

    const flooredIndex = Math.floor(index);
    const [lower] = sortedSamples[flooredIndex];
    const [upper] = sortedSamples[flooredIndex + 1];
    const difference = upper - lower;
    const ratio = index % 1;

    return lower + (ratio * difference);
  }

  // eslint-disable-next-line max-statements
  rate(): number {
    this.removeOld();

    if (this.samples.length == 0) {
      return NaN;
    }

    if (this.samples.length == 1) {
      return this.samples[0][0];
    }

    const [oldestValue, oldestTimer] = this.samples[0];
    const [newestValue, newestTimer] = this.samples[this.samples.length - 1];

    const delta = newestValue - oldestValue;
    const seconds = (oldestTimer.milliseconds - newestTimer.milliseconds) / 1000;
    const rate = delta / seconds;

    return rate;
  }

  rateBySum(): number {
    this.removeOld();

    if (this.samples.length == 0) {
      return NaN;
    }

    if (this.samples.length == 1) {
      return this.samples[0][0];
    }

    const sum = this.sum(true);
    const interval = this.actualInterval(true);
    const seconds = interval / 1000;
    const rate = sum / seconds;

    return rate;
  }

  actualInterval(skipRemoveOldSamples: boolean = false): number {
    if (!skipRemoveOldSamples) {
      this.removeOld();
    }

    if (this.samples.length <= 1) {
      return NaN;
    }

    const [, oldestTimer] = this.samples[0];
    const [, newestTimer] = this.samples[this.samples.length - 1];
    return oldestTimer.milliseconds - newestTimer.milliseconds;
  }

  private sortedByValue(): Sample[] {
    return [...this.samples].sort(([a], [b]) => a - b);
  }

  private removeOld(): void {
    const firstIndexToKeep = this.samples.findIndex(([, timer]) => timer.milliseconds <= this.interval);

    if (firstIndexToKeep > 0) {
      this.samples.splice(0, firstIndexToKeep);
    }
  }
}
