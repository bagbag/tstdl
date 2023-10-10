/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, inject } from '@angular/core';
import type { CustomErrorStatic } from '@tstdl/base/errors';
import { CustomError, errorsLocalizationKeys } from '@tstdl/base/errors';
import { LocalizationService, type DynamicText } from '@tstdl/base/text';
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
  readonly #localizationService = inject(LocalizationService);

  private readonly format = { ...defaultFormatErrorOptions, ...inject(ErrorHandlerServiceOptions, { optional: true })?.format };

  getErrorMessage(error: unknown): { header?: DynamicText, message: DynamicText } {
    if ((error instanceof CustomError)) {
      const errorLocalizationKey = errorsLocalizationKeys.errors[(error.constructor as CustomErrorStatic).errorName]!;
      const headerLocalizationKey = errorLocalizationKey.header;
      const messageLocalizationKey = errorLocalizationKey.message;

      const hasHeader = this.#localizationService.hasKey(headerLocalizationKey);
      const hasMessage = this.#localizationService.hasKey(messageLocalizationKey ?? '');

      if (hasHeader || hasMessage) {
        return {
          header: hasMessage ? { key: headerLocalizationKey, parameters: error } : undefined,
          message: { key: messageLocalizationKey ?? headerLocalizationKey, parameters: error }
        };
      }
    }

    return {
      header: (error instanceof Error) ? error.name : undefined,
      message: formatError(error, this.format)
    };
  }
}
