/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import type { ErrorHandler } from '@angular/core';
import { Injectable } from '@angular/core';
import { formatError } from '@tstdl/base/cjs/utils';
import type { OperatorFunction } from 'rxjs';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Logger } from './logger.service';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root'
})
export class ErrorHandlerService implements ErrorHandler {
  private readonly notificationService: NotificationService;
  private readonly logger: Logger;

  constructor(notificationService: NotificationService, logger: Logger) {
    this.notificationService = notificationService;
    this.logger = logger;
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

    const message = formatError(error, { includeRest: false, includeStack: false, handleBuiltInErrors: true });
    this.notificationService.notify({ message });
  }
}
