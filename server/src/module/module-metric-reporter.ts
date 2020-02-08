import { Enumerable } from '@tstdl/base/enumerable';
import { Logger } from '@tstdl/base/logger';
import { cancelableTimeout, CancellationToken, MetricAggregation, MetricAggregationOptions, MovingMetric } from '@tstdl/base/utils';
import { ModuleMetric } from './module';

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
  private readonly logger: Logger;
  private readonly sampleCount: number;
  private readonly sampleInterval: number;
  private readonly reportEveryNthSample: number;

  private longestGroupName: number;
  private longestDisplayName: number;

  constructor(logger: Logger, sampleCount: number, sampleInterval: number, reportEveryNthSample: number) {
    this.logger = logger;
    this.sampleCount = sampleCount;
    this.sampleInterval = sampleInterval;
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

  private updateNameLengths(): void {
    this.longestGroupName = Enumerable.from(this.metricGroups)
      .reduce((longest, { groupName }) => Math.max(longest, groupName.length), 0);

    this.longestDisplayName = Enumerable.from(this.metricGroups)
      .mapMany((group) => group.registrations)
      .mapMany(({ reports }) => reports)
      .reduce((longest, { displayName }) => Math.max(longest, displayName.length), 0);
  }

  async run(cancellationToken: CancellationToken): Promise<void> {
    let counter = 0;

    while (!cancellationToken.isSet) {
      for (const { registrations } of this.metricGroups) {
        for (const { metric, moving } of registrations) {
          moving.add(metric.getValue());
        }
      }

      if (counter++ % this.reportEveryNthSample == 0) {
        for (const { groupName, registrations } of this.metricGroups) {
          console.log(`--- ${groupName} `.padEnd(this.longestGroupName + 8));

          for (const { moving, reports } of registrations) {
            for (const report of reports) {
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
}
