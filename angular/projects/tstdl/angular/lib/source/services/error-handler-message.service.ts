/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, Injector, inject } from '@angular/core';
import type { CustomErrorStatic } from '@tstdl/base/errors';
import { CustomError, errorsLocalizationKeys, unwrapError } from '@tstdl/base/errors';
import { LocalizationService, type DynamicText } from '@tstdl/base/text';
import type { FormatErrorOptions } from '@tstdl/base/utils';
import { formatError, isUndefined } from '@tstdl/base/utils';

export class ErrorHandlerServiceOptions {
  format?: FormatErrorOptions;
}

const defaultFormatErrorOptions: FormatErrorOptions = { includeName: false, includeRest: false, includeStack: false };

@Injectable({
  providedIn: 'root'
})
export abstract class ErrorHandlerMessageService {
  readonly #injector = inject(Injector);

  #_localizationService: LocalizationService | undefined;

  get #localizationService(): LocalizationService {
    if (isUndefined(this.#_localizationService)) {
      this.#_localizationService = this.#injector.get(LocalizationService);
    }

    return this.#_localizationService;
  }

  private readonly format = { ...defaultFormatErrorOptions, ...inject(ErrorHandlerServiceOptions, { optional: true })?.format };

  getErrorMessage(error: unknown): { header?: DynamicText, message: DynamicText } {
    const actualError = unwrapError(error);

    if ((actualError instanceof CustomError)) {
      const errorLocalizationKey = errorsLocalizationKeys.errors[(actualError.constructor as CustomErrorStatic).errorName]!;
      const headerLocalizationKey = errorLocalizationKey.header;
      const messageLocalizationKey = errorLocalizationKey.message;

      const hasHeader = this.#localizationService.hasKey(headerLocalizationKey);
      const hasMessage = this.#localizationService.hasKey(messageLocalizationKey ?? '');

      if (hasHeader || hasMessage) {
        return {
          header: hasMessage ? { key: headerLocalizationKey, parameters: actualError } : undefined,
          message: { key: messageLocalizationKey ?? headerLocalizationKey, parameters: actualError }
        };
      }
    }

    return {
      header: (actualError instanceof Error) ? actualError.name : undefined,
      message: formatError(actualError, this.format)
    };
  }
}
