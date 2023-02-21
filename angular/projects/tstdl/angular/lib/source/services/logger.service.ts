import { Inject, Injectable, InjectionToken } from '@angular/core';
import type { LogEntryOrProvider, LogErrorOptions } from '@tstdl/base/logger';
import { Logger as TstdlLogger } from '@tstdl/base/logger';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const LOGGER = new InjectionToken<Logger>('Logger');

@Injectable({
  providedIn: 'root'
})
export class Logger extends TstdlLogger {
  private readonly logger: TstdlLogger;

  constructor(@Inject(LOGGER) logger: TstdlLogger) {
    super(logger.level, logger.module, logger.logPrefix);

    this.logger = logger;
  }

  fork(subModule: string): TstdlLogger {
    return new Logger(this.logger.fork(subModule));
  }

  prefix(prefix: string): TstdlLogger {
    return new Logger(this.logger.prefix(prefix));
  }

  override error(error: Error, options?: LogErrorOptions): void;
  override error(entry: LogEntryOrProvider): void;
  override error(error: any, options?: LogErrorOptions): void {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    this.logger.error(error, options);
  }

  override warn(entry: LogEntryOrProvider): void {
    this.logger.warn(entry);
  }

  override info(entry: LogEntryOrProvider): void {
    this.logger.info(entry);
  }

  override verbose(entry: LogEntryOrProvider): void {
    this.logger.verbose(entry);
  }

  override debug(entry: LogEntryOrProvider): void {
    this.logger.debug(entry);
  }

  override trace(entry: LogEntryOrProvider): void {
    this.logger.trace(entry);
  }

  protected log(): void {
    throw new Error('Method not implemented.');
  }
}
