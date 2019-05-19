import { Logger } from '../logger';

// tslint:disable: no-empty
export class NoopLogger implements Logger {
  prefix(): Logger {
    return this;
  }

  error(): void { }

  warn(): void { }

  info(): void { }

  verbose(): void { }

  debug(): void { }

  trace(): void { }
}

export const noopLogger = new NoopLogger();
