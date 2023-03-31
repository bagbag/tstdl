/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import type { ErrorHandler } from '@angular/core';
import { Injectable, Optional } from '@angular/core';
import { container } from '@tstdl/base/container';
import { Logger } from '@tstdl/base/logger';
import type { FormatErrorOptions } from '@tstdl/base/utils';
import { formatError } from '@tstdl/base/utils';
import type { Observable, OperatorFunction } from 'rxjs';
import { Subject, catchError, throwError } from 'rxjs';
import { NotificationService } from './notification.service';

export class ErrorHandlerServiceOptions {
  format?: FormatErrorOptions;
};

const defaultFormatErrorOptions: FormatErrorOptions = { includeName: false, includeRest: false, includeStack: false };

@Injectable({
  providedIn: 'root'
})
export class ErrorHandlerService implements ErrorHandler {
  private readonly notificationService: NotificationService;
  private readonly logger: Logger;
  private readonly format: FormatErrorOptions;
  private readonly errorSubject: Subject<any>;

  readonly error$: Observable<any>;

  constructor(notificationService: NotificationService, @Optional() options: ErrorHandlerServiceOptions | null) {
    this.notificationService = notificationService;
    this.logger = container.resolve(Logger);
    this.format = { ...defaultFormatErrorOptions, ...options?.format };

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
    this.notificationService.notify({ header: (error instanceof Error) ? error.name : undefined, message, type: 'error' });
  }
}
