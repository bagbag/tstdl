import type { ValueOrProvider } from '#/utils/value-or-provider.js';

export type TimeoutOptions = {
  timeout?: number
};

export type LoadState = 'load' | 'domcontentloaded' | 'networkidle';

export type WaitForStateOptions = {
  waitUntil: LoadState
};

export type Abortable = {
  abort?: AbortSignal
};

export type Delay = ValueOrProvider<number>;

export type ActionDelayOptions = {
  actionDelay?: Delay
};
