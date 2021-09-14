import { Inject, Injectable, InjectionToken } from '@angular/core';
import type { LogErrorOptions } from '@tstdl/base/cjs/logger';
import { Logger as TstdlLogger } from '@tstdl/base/cjs/logger';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const LOGGER = new InjectionToken<Logger>('Logger');

@Injectable({
  providedIn: 'root'
})
export class Logger implements TstdlLogger {
  private readonly logger: TstdlLogger;

  constructor(@Inject(LOGGER) logger: TstdlLogger) {
    this.logger = logger;
  }

  prefix(prefix: string): TstdlLogger {
    return this.logger.prefix(prefix);
  }

  error(error: Error, options?: LogErrorOptions): void;
  error(entry: string): void;
  error(error: Error | string, options?: LogErrorOptions): void {
    this.logger.error(error as Error, options);
  }

  warn(entry: string): void {
    this.logger.warn(entry);
  }

  info(entry: string): void {
    this.logger.info(entry);
  }

  verbose(entry: string): void {
    this.logger.verbose(entry);
  }

  debug(entry: string): void {
    this.logger.debug(entry);
  }

  trace(entry: string): void {
    this.logger.trace(entry);
  }
}
