import type { SecretRequirementsError } from '#/authentication/index.js';
import { type HttpError, HttpErrorReason } from '#/http/http.error.js';
import { enumerationLocalization, getLocalizationKeys, type Localization, type LocalizeFunctionContext, type LocalizeItem } from '#/text/localization.service.js';
import type { Enumeration } from '#/types.js';
import { isDefined, isNotNull } from '#/utils/type-guards.js';
import type { ApiError } from './api.error.js';
import type { BadRequestError } from './bad-request.error.js';
import type { CustomError, CustomErrorStatic } from './custom.error.js';
import type { ForbiddenError } from './forbidden.error.js';
import type { InvalidCredentialsError } from './invalid-credentials.error.js';
import type { InvalidTokenError } from './invalid-token.error.js';
import type { MaxBytesExceededError } from './max-bytes-exceeded.error.js';
import type { MethodNotAllowedError } from './method-not-allowed.error.js';
import type { NotFoundError } from './not-found.error.js';
import type { NotImplementedError } from './not-implemented.error.js';
import type { NotSupportedError } from './not-supported.error.js';
import type { TimeoutError } from './timeout.error.js';
import type { UnauthorizedError } from './unauthorized.error.js';

type ErrorLocalizationEntry<T extends CustomError> = {
  header: LocalizeItem<T>,
  message?: LocalizeItem<T>
};

export type ErrorsLocalizationEntries<T extends CustomErrorStatic[]> = {
  [ErrorName in T[number]['errorName']]: ErrorLocalizationEntry<InstanceType<Extract<T[number], { errorName: ErrorName }>>>
};

export type ErrorsLocalization<T extends CustomErrorStatic[] = CustomErrorStatic[], Enums extends Enumeration[] = Enumeration[]> = Localization<{
  tstdl: {
    errors: ErrorsLocalizationEntries<T>
  }
}, Enums>;

type TstdlErrors = [
  typeof ApiError,
  typeof BadRequestError,
  typeof ForbiddenError,
  typeof InvalidCredentialsError,
  typeof InvalidTokenError,
  typeof MaxBytesExceededError,
  typeof MethodNotAllowedError,
  typeof NotFoundError,
  typeof NotImplementedError,
  typeof NotSupportedError,
  typeof TimeoutError,
  typeof UnauthorizedError,
  typeof HttpError,
  typeof SecretRequirementsError
];

export const tstdlErrorsLocalizationKeys = getLocalizationKeys<ErrorsLocalization>().tstdl;

export const germanTstdlErrorsLocalization: ErrorsLocalization<TstdlErrors, [typeof HttpErrorReason]> = {
  language: { code: 'de', name: 'Deutsch' },
  keys: {
    tstdl: {
      errors: {
        ApiError: {
          header: 'API Fehler',
          message: 'Bitte versuchen Sie es später noch einmal.'
        },
        BadRequestError: {
          header: 'Ungültige Anfrage',
          message: getErrorMessage
        },
        ForbiddenError: {
          header: 'Zugriff nicht erlaubt',
          message: getErrorMessage
        },
        InvalidCredentialsError: {
          header: 'Ungültige Zugangsdaten',
          message: 'Überprüfen Sie Ihre Eingaben'
        },
        InvalidTokenError: {
          header: 'Anmeldung abgelaufen oder ungültig',
          message: 'Bitte melden Sie sich erneut an'
        },
        MaxBytesExceededError: {
          header: 'Daten größer als erlaubt',
          message: getErrorMessage
        },
        MethodNotAllowedError: {
          header: 'Anfrage nicht erlaubt',
          message: getErrorMessage
        },
        NotFoundError: {
          header: 'Nicht gefunden',
          message: getErrorMessage
        },
        NotImplementedError: {
          header: 'Funktion nicht implementiert',
          message: getErrorMessage
        },
        NotSupportedError: {
          header: 'Nicht unterstützt',
          message: getErrorMessage
        },
        TimeoutError: {
          header: 'Zeitüberschreitung',
          message: getErrorMessage
        },
        UnauthorizedError: {
          header: 'Unautorisiert',
          message: getErrorMessage
        },
        HttpError: {
          header: (error) => (
            (isDefined(error.response) && error.response.statusCode != 0)
              ? `Http Fehler - ${error.response.statusCode.toString()}`
              : 'Http Fehler'
          ),
          message: getHttpErrorMessage
        },
        SecretRequirementsError: {
          header: 'Passwortanforderungen nicht erfüllt',
          message: getErrorMessage
        }
      }
    }
  },
  enums: [
    enumerationLocalization(HttpErrorReason, {
      [HttpErrorReason.Unknown]: 'Unerwarteter Fehler',
      [HttpErrorReason.Cancelled]: 'Anfrage abgebrochen',
      [HttpErrorReason.Network]: 'Netzwerkfehler',
      [HttpErrorReason.InvalidRequest]: 'Ungültige Anfrage',
      [HttpErrorReason.StatusCode]: 'Antwort enthielt einen Fehler',
      [HttpErrorReason.ErrorResponse]: 'Antwort enthielt einen Fehler',
      [HttpErrorReason.ResponseError]: 'Fehler beim Empfang der Antwort',
      [HttpErrorReason.Timeout]: 'Zeitüberschreitung'
    })
  ]
};

export const englishTstdlErrorsLocalization: ErrorsLocalization<TstdlErrors> = {
  language: { code: 'en', name: 'English' },
  keys: {
    tstdl: {
      errors: {
        ApiError: {
          header: 'API error',
          message: 'Please try again later'
        },
        BadRequestError: {
          header: 'Bad Request',
          message: getErrorMessage
        },
        ForbiddenError: {
          header: 'Access forbidden',
          message: getErrorMessage
        },
        InvalidCredentialsError: {
          header: 'Invalid credentials',
          message: 'Check your inputs'
        },
        InvalidTokenError: {
          header: 'Login expired or invalid',
          message: 'Please log in again'
        },
        MaxBytesExceededError: {
          header: 'Data larger than allowed',
          message: getErrorMessage
        },
        MethodNotAllowedError: {
          header: 'Request not allowed',
          message: getErrorMessage
        },
        NotFoundError: {
          header: 'Not found',
          message: getErrorMessage
        },
        NotImplementedError: {
          header: 'Function not implemented',
          message: getErrorMessage
        },
        NotSupportedError: {
          header: 'Not supported',
          message: getErrorMessage
        },
        TimeoutError: {
          header: 'Timeout',
          message: getErrorMessage
        },
        UnauthorizedError: {
          header: 'Unauthorized',
          message: getErrorMessage
        },
        HttpError: {
          header: (error) => (
            (isDefined(error.response) && error.response.statusCode != 0)
              ? `Http error - ${error.response.statusCode.toString()}`
              : 'Http error'
          ),
          message: getHttpErrorMessage
        },
        SecretRequirementsError: {
          header: 'Secret requirements not met',
          message: getErrorMessage
        }
      }
    }
  },
  enums: [
    enumerationLocalization(HttpErrorReason, {
      [HttpErrorReason.Unknown]: 'Unexpected error',
      [HttpErrorReason.Cancelled]: 'Request cancelled',
      [HttpErrorReason.Network]: 'Network error',
      [HttpErrorReason.InvalidRequest]: 'Invalid request',
      [HttpErrorReason.StatusCode]: 'Response contained an error',
      [HttpErrorReason.ErrorResponse]: 'Response contained an error',
      [HttpErrorReason.ResponseError]: 'Error while receiving the response',
      [HttpErrorReason.Timeout]: 'Zeitüberschreitung'
    })
  ]
};

function getHttpErrorMessage(error: HttpError, context: LocalizeFunctionContext): string {
  return (isDefined(error.response) && (isNotNull(error.response.statusMessage)))
    ? error.response.statusMessage
    : context.localizationService.localizeOnce({ enum: HttpErrorReason, value: error.reason });
}

function getErrorMessage(error: Error): string {
  return error.message.replace(/\.$/u, '');
}
