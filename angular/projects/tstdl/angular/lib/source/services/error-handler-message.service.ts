/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, inject } from '@angular/core';
import type { DynamicText } from '@tstdl/base/text';
import type { FormatErrorOptions } from '@tstdl/base/utils';
import { formatError } from '@tstdl/base/utils';

export class ErrorHandlerServiceOptions {
  format?: FormatErrorOptions;
}

const defaultFormatErrorOptions: FormatErrorOptions = { includeName: false, includeRest: false, includeStack: false };

@Injectable({
  providedIn: 'root'
})
export abstract class ErrorHandlerMessageService {
  private readonly format = { ...defaultFormatErrorOptions, ...inject(ErrorHandlerServiceOptions, { optional: true })?.format };

  getErrorMessage(error: unknown): { header?: DynamicText, message: DynamicText } {
    return {
      header: (error instanceof Error) ? error.name : undefined,
      message: formatError(error, this.format)
    };
  }
}
