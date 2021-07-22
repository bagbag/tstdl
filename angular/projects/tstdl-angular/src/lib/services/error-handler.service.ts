/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { ErrorHandler, Inject, Injectable } from '@angular/core';
import { Logger } from '@tstdl/base/esm/logger';
import { formatError } from '@tstdl/base/esm/utils';
import { catchError, OperatorFunction, throwError } from 'rxjs';
import { loggerInjectionToken } from '../utils/injection-tokens';
import { NotificationService, notificationServiceInjectionToken } from './notification-service';

@Injectable({
  providedIn: 'root'
})
export class ErrorHandlerService implements ErrorHandler {
  private readonly notificationService: NotificationService;
  private readonly logger: Logger;

  constructor(@Inject(notificationServiceInjectionToken) notificationService: NotificationService, @Inject(loggerInjectionToken) logger: Logger) {
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

    const message = formatError(error);

    void this.notificationService.notify({ message });
  }
}
