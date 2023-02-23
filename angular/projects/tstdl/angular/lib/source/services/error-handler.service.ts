/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import type { ErrorHandler } from '@angular/core';
import { Inject, Injectable, InjectionToken, Optional } from '@angular/core';
import { Logger } from '@tstdl/base/logger';
import type { FormatErrorOptions } from '@tstdl/base/utils';
import { formatError } from '@tstdl/base/utils';
import type { Observable, OperatorFunction } from 'rxjs';
import { catchError, Subject, throwError } from 'rxjs';
import { NotificationService } from './notification.service';

export type ErrorHandlerServiceOptions = {
  format?: FormatErrorOptions
};

// eslint-disable-next-line @typescript-eslint/naming-convention
export const ERROR_HANDLER_SERVICE_OPTIONS = new InjectionToken<ErrorHandlerServiceOptions>('ErrorHandlerServiceOptions');

const defaultFormatErrorOptions: FormatErrorOptions = { includeRest: false, includeStack: false };

@Injectable({
  providedIn: 'root'
})
export class ErrorHandlerService implements ErrorHandler {
  private readonly notificationService: NotificationService;
  private readonly logger: Logger;
  private readonly format: FormatErrorOptions;
  private readonly errorSubject: Subject<any>;

  readonly error$: Observable<any>;

  constructor(notificationService: NotificationService, logger: Logger, @Optional() @Inject(ERROR_HANDLER_SERVICE_OPTIONS) options: ErrorHandlerServiceOptions | null) {
    this.notificationService = notificationService;
    this.logger = logger;
    this.format = options?.format ?? defaultFormatErrorOptions;

    this.errorSubject = new Subject();
    this.error$ = this.errorSubject.asObservable();
  }

  handleError$<T>(): OperatorFunction<T, T> {
    return catchError((error: Error) => {
      this.handleError(error);
      return throwError(() => error);
    });
  }

  // eslint-disable-next-line max-statements
  handleError(error: any): void {
    this.logger.error(error as Error, { includeRest: true, includeStack: true });
    this.errorSubject.next(error);

    const message = formatError(error, this.format);
    this.notificationService.notify({ message, type: 'error' });
  }
}
