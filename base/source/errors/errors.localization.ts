import { SecretRequirementsError } from '#/authentication/index.js';
import { HttpError, HttpErrorReason } from '#/http/http.error.js';
import type { Localization, LocalizeItem } from '#/text/localization.service.js';
import { enumerationLocalization, getLocalizationKeys } from '#/text/localization.service.js';
import { Enumeration } from '#/types.js';
import { isDefined } from '#/utils/type-guards.js';
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
  errors: ErrorsLocalizationEntries<T>
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

export const errorsLocalizationKeys = getLocalizationKeys<ErrorsLocalization>();

export const germanTstdlErrorsLocalization: ErrorsLocalization<TstdlErrors, [typeof HttpErrorReason]> = {
  language: { code: 'de', name: 'Deutsch' },
  keys: {
    errors: {
      ApiError: {
        header: 'API Fehler',
        message: getErrorMessage
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
        message: getErrorMessage
      },
      InvalidTokenError: {
        header: 'Anmeldung abgelaufen oder ungültig',
        message: getErrorMessage
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
        message: (error, context) => context.localizationService.localizeOnce({ enum: HttpErrorReason, value: error.reason })
      },
      SecretRequirementsError: {
        header: 'Passwortanforderungen nicht erfüllt',
        message: getErrorMessage
      }
    }
  },
  enums: [
    enumerationLocalization(HttpErrorReason, {
      [HttpErrorReason.Unknown]: 'Unbekannt',
      [HttpErrorReason.Cancelled]: 'Anfrage abgebrochen',
      [HttpErrorReason.InvalidRequest]: 'Ungültige Anfrage',
      [HttpErrorReason.Non200StatusCode]: 'Antwort enthielt einen Fehler',
      [HttpErrorReason.ErrorResponse]: 'Antwort enthielt einen Fehler',
      [HttpErrorReason.ResponseError]: 'Fehler beim Empfang der Antwort',
      [HttpErrorReason.Timeout]: 'Zeitüberschreitung'
    })
  ]
};

export const englishTstdlErrorsLocalization: ErrorsLocalization<TstdlErrors> = {
  language: { code: 'en', name: 'English' },
  keys: {
    errors: {
      ApiError: {
        header: 'API error',
        message: getErrorMessage
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
        message: getErrorMessage
      },
      InvalidTokenError: {
        header: 'Login expired or invalid',
        message: getErrorMessage
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
        message: (error, context) => context.localizationService.localizeOnce({ enum: HttpErrorReason, value: error.reason })
      },
      SecretRequirementsError: {
        header: 'Secret requirements not met',
        message: getErrorMessage
      }
    }
  },
  enums: [
    enumerationLocalization(HttpErrorReason, {
      [HttpErrorReason.Unknown]: 'Unknown',
      [HttpErrorReason.Cancelled]: 'Request cancelled',
      [HttpErrorReason.InvalidRequest]: 'Invalid request',
      [HttpErrorReason.Non200StatusCode]: 'Response contained an error',
      [HttpErrorReason.ErrorResponse]: 'Response contained an error',
      [HttpErrorReason.ResponseError]: 'Error while receiving the response',
      [HttpErrorReason.Timeout]: 'Zeitüberschreitung'
    })
  ]
};

function getErrorMessage(error: Error): string {
  return `${error.message}`;
}