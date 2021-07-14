/* eslint-disable class-methods-use-this, @typescript-eslint/no-empty-function */

import type { Logger } from '../logger';

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
