import { StringMap } from '@tstdl/base/types';

export enum ModuleMetricType {
  Counter,
  Gauge
}

export type ModuleMetric = {
  type: ModuleMetricType,
  labels?: string[],
  getValue(): number
};

export enum ModuleState {
  Running,
  Stopping,
  Stopped,
  Erroneous
}

export interface Module {
  readonly name: string;

  metrics: StringMap<ModuleMetric>;
  run(): Promise<void>;
  stop(): Promise<void>;
}
