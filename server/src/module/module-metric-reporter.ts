import { cancelableTimeout, CancellationToken, FactoryMap, MovingMetric } from '@tstdl/base/utils';
import { ModuleMetric } from './module';
import { Logger } from '@tstdl/base/logger';
import { Enumerable } from '@tstdl/base/enumerable';

type

export class ModuleMetricReporter {
  private readonly metricGroups: FactoryMap<string, Map<ModuleMetric, MovingMetric>>;
  private readonly logger: Logger;
  private readonly sampleCount: number;
  private readonly sampleInterval: number;
  private readonly reportEveryNthSample: number;

  constructor(logger: Logger, sampleCount: number, sampleInterval: number, reportEveryNthSample: number) {
    this.logger = logger;
    this.sampleCount = sampleCount;
    this.sampleInterval = sampleInterval;
    this.reportEveryNthSample = reportEveryNthSample;

    this.metricGroups = new FactoryMap(() => new Map());
  }

  registerModuleMetrics(groupName: string, ...metrics: ModuleMetric[]): void {
    for (const metric of metrics) {
      this.metricGroups.get(groupName).set(metric, new MovingMetric(this.sampleCount * this.sampleInterval));
    }
  }

  async run(cancellationToken: CancellationToken): Promise<void> {
    let counter = 0;

    while (!cancellationToken.isSet) {
      for (const [group, metrics] of this.metricGroups) {
        for (const [metric, movingMetric] of metrics) {
          movingMetric.add(metric.getValue());
        }
      }

      if (counter++ % this.reportEveryNthSample == 0) {
        const longestGroupName = Enumerable.from(this.metricGroups.keys()).reduce((longest, name) => Math.max(longest, name.length), 0);
        const longestMetricName = Enumerable.from(this.metricGroups.values()).map((map) => map.keys()).reduce((longest, metric) => Math.max(longest, metric), 0);

        console.log(`
--- Indexer -----
| import-count       : 512355
| another-large-name : 444.3
--- Importer ----
|
        `);
      }

      await cancelableTimeout(this.sampleInterval, cancellationToken);
    }
  }
}
