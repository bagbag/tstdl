/* eslint-disable class-methods-use-this, @typescript-eslint/no-empty-function */

import { LogLevel } from '../level';
import { Logger } from '../logger';

export class NoopLogger extends Logger {
  constructor() {
    super(LogLevel.Trace, '', '');
  }

  fork(): Logger {
    return this;
  }

  prefix(): Logger {
    return this;
  }

  protected log(): void {
    // noop
  }
}

export const noopLogger = new NoopLogger();
