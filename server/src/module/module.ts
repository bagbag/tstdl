import { Observable } from 'rxjs';

export enum ModuleMetricType {
  Counter,
  Gauge
}

export type ModuleMetricValue = {
  value: number,
  labels: string[]
};

export type ModuleMetric = {
  name: string,
  type: ModuleMetricType,
  values: Observable<ModuleMetricValue>
};

export enum ModuleState {
  Running,
  Stopping,
  Stopped,
  Erroneous
}

export interface Module {
  readonly name: string;
  readonly metrics: ReadonlyArray<ModuleMetric>;
  start(): Promise<void>;
  stop(): Promise<void>;
}
