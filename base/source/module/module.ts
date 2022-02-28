import type { StringMap } from '#/types';

export enum ModuleMetricType {
  Counter = 0,
  Gauge = 1
}

export type ModuleMetric = {
  type: ModuleMetricType,
  labels?: string[],
  getValue(): number
};

export enum ModuleState {
  Running = 0,
  Stopping = 1,
  Stopped = 2,
  Erroneous = 3
}

export interface Module {
  readonly name: string;
  readonly state: ModuleState;

  readonly metrics: StringMap<ModuleMetric>;
  run(): Promise<void>;
  stop(): Promise<void>;
}
