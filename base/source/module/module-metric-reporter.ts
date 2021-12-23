/* eslint-disable no-console */

import { Enumerable } from '#/enumerable';
import type { ReadonlyCancellationToken } from '#/utils/cancellation-token';
import type { MetricAggregation, MetricAggregationOptions } from '#/utils/moving-metric';
import { MovingMetric } from '#/utils/moving-metric';
import { cancelableTimeout } from '#/utils/timing';
import type { ModuleMetric } from './module';

type MetricReport<Aggregation extends MetricAggregation> = {
  displayName: string,
  aggregation: Aggregation,
  aggregationOptions?: MetricAggregationOptions<Aggregation>
};

type MetricReportRegistration = {
  metric: ModuleMetric,
  moving: MovingMetric,
  reports: MetricReport<MetricAggregation>[]
};

export class ModuleMetricReporter {
  private readonly metricGroups: { groupName: string, registrations: MetricReportRegistration[] }[];
  private readonly sampleInterval: number;
  private readonly sampleCount: number;
  private readonly reportEveryNthSample: number;

  private longestGroupName: number;
  private longestDisplayName: number;

  constructor(sampleInterval: number, sampleCount: number, reportEveryNthSample: number) {
    this.sampleInterval = sampleInterval;
    this.sampleCount = sampleCount;
    this.reportEveryNthSample = reportEveryNthSample;

    this.metricGroups = [];
    this.longestGroupName = 0;
    this.longestDisplayName = 0;
  }

  register(groupName: string, ...metrics: { metric: ModuleMetric, reports: MetricReport<MetricAggregation>[] }[]): void {
    const registrations = metrics.map(({ metric, reports }) => {
      const registration: MetricReportRegistration = {
        metric,
        moving: new MovingMetric(this.sampleCount * this.sampleInterval),
        reports
      };

      return registration;
    });

    this.metricGroups.push({ groupName, registrations });

    this.updateNameLengths();
  }

  async run(cancellationToken: ReadonlyCancellationToken): Promise<void> {
    let counter = 0;

    while (cancellationToken.isUnset) {
      for (const { registrations } of this.metricGroups) {
        for (const { metric, moving } of registrations) {
          moving.add(metric.getValue());
        }
      }

      if (counter++ % this.reportEveryNthSample == 0) {
        for (const { groupName, registrations } of this.metricGroups) {
          console.log(`--- ${groupName} `.padEnd(this.longestGroupName + 8));

          for (const { moving, reports } of registrations) {
            for (const report of reports) { // eslint-disable-line max-depth
              const value = moving.aggregate(report.aggregation, report.aggregationOptions);
              const paddedName = report.displayName.padEnd(this.longestDisplayName);
              console.log(`| ${paddedName} : ${value}`);
            }
          }
        }
      }

      await cancelableTimeout(this.sampleInterval, cancellationToken);
    }
  }

  private updateNameLengths(): void {
    this.longestGroupName = Enumerable.from(this.metricGroups)
      .reduce((longest, { groupName }) => Math.max(longest, groupName.length), 0);

    this.longestDisplayName = Enumerable.from(this.metricGroups)
      .mapMany((group) => group.registrations)
      .mapMany(({ reports }) => reports)
      .reduce((longest, { displayName }) => Math.max(longest, displayName.length), 0);
  }
}
