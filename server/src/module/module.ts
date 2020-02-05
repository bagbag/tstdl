export enum ModuleMetricType {
  Counter,
  Gauge
}

export type ModuleMetric = {
  name: string,
  type: ModuleMetricType,
  value: number,
  labels?: string[]
};

export enum ModuleState {
  Running,
  Stopping,
  Stopped,
  Erroneous
}

export interface Module {
  readonly name: string;

  getMetrics(): ModuleMetric[];
  run(): Promise<void>;
  stop(): Promise<void>;
}
