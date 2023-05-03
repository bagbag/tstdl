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
