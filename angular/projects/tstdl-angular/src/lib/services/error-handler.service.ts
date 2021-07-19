/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { HttpErrorResponse } from '@angular/common/http';
import { ErrorHandler, Inject, Injectable } from '@angular/core';
import { HttpError } from '@tstdl/base/esm/http';
import { Logger } from '@tstdl/base/esm/logger';
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

  handleError(error: any): void {
    this.logger.error(error as Error);

    let message = '';

    if ((error instanceof HttpError) || (error instanceof HttpErrorResponse)) {
      message = error.message;
    }

    if (error instanceof Error) {
      message += `${error.name}: ${error.message}`;
    }

    if (error.rejection instanceof Error) {
      this.handleError(error.rejection);
      return;
    }

    if (error.error instanceof Error) {
      this.handleError(error.error);
      return;
    }

    if (message == '') {
      try {
        message = JSON.stringify(error, null, 2);
      }
      catch (stringifyError: unknown) {
        this.handleError(stringifyError);
        return;
      }
    }

    void this.notificationService.notify({ message });
  }
}
