/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import type { ErrorHandler } from '@angular/core';
import { Injectable, inject } from '@angular/core';
import { container } from '@tstdl/base/container';
import { Logger } from '@tstdl/base/logger';
import type { OperatorFunction } from 'rxjs';
import { Subject, catchError, throwError } from 'rxjs';

import { ErrorHandlerMessageService } from './error-handler-message.service';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root'
})
export class ErrorHandlerService implements ErrorHandler {
  private readonly notificationService = inject(NotificationService);
  private readonly errorHandlerMessageService = inject(ErrorHandlerMessageService);
  private readonly logger = container.resolve(Logger);
  private readonly errorSubject = new Subject<any>();

  readonly error$ = this.errorSubject.asObservable();

  handleError$<T>(): OperatorFunction<T, T> {
    return catchError((error: Error) => {
      this.handleError(error);
      return throwError(() => error);
    });
  }

  // eslint-disable-next-line max-statements
  handleError(error: unknown): void {
    this.logger.error(error as Error, { includeRest: true, includeStack: true });
    this.errorSubject.next(error);

    const notificationData = this.errorHandlerMessageService.getErrorMessage(error);
    this.notificationService.notify({ type: 'error', ...notificationData });
  }
}
