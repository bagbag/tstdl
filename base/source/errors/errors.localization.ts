import type { SecretRequirementsError } from '#/authentication/index.js';
import { type HttpError, HttpErrorReason } from '#/http/http.error.js';
import { enumerationLocalization, getLocalizationKeys, type Localization, type LocalizeFunctionContext, type LocalizeItem } from '#/text/localization.service.js';
import type { Enumeration } from '#/types/index.js';
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
  typeof SecretRequirementsError,
];

export const tstdlErrorsLocalizationKeys = getLocalizationKeys<ErrorsLocalization>().tstdl;

export const germanTstdlErrorsLocalization: ErrorsLocalization<TstdlErrors, [typeof HttpErrorReason]> = {
  language: { code: 'de', name: 'Deutsch' },
  keys: {
    tstdl: {
      errors: {
        ApiError: {
          header: 'Ein Serverfehler ist aufgetreten',
          message: 'Bitte versuchen Sie es in einem Moment erneut. Sollte das Problem weiterhin bestehen, kontaktieren Sie bitte den Support.',
        },
        BadRequestError: {
          header: 'Ungültige Eingabe',
          message: 'Bitte überprüfen Sie die eingegebenen Daten und versuchen Sie es erneut.',
        },
        ForbiddenError: {
          header: 'Zugriff verweigert',
          message: 'Sie haben nicht die erforderlichen Berechtigungen, um diese Aktion auszuführen.',
        },
        InvalidCredentialsError: {
          header: 'Ungültige Zugangsdaten',
          message: 'Der Benutzername oder das Passwort ist falsch. Bitte überprüfen Sie Ihre Eingaben.',
        },
        InvalidTokenError: {
          header: 'Sitzung abgelaufen',
          message: 'Ihre Sitzung ist abgelaufen oder ungültig. Bitte melden Sie sich erneut an.',
        },
        MaxBytesExceededError: {
          header: 'Datei zu groß',
          message: 'Die ausgewählte Datei überschreitet die maximal zulässige Größe.',
        },
        MethodNotAllowedError: {
          header: 'Unerwarteter Fehler',
          message: 'Ein interner Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.',
        },
        NotFoundError: {
          header: 'Nicht gefunden',
          message: 'Das gesuchte Element konnte nicht gefunden werden. Möglicherweise wurde es verschoben oder gelöscht.',
        },
        NotImplementedError: {
          header: 'Funktion nicht verfügbar',
          message: 'Diese Funktion ist noch nicht verfügbar. Bitte versuchen Sie es zu einem späteren Zeitpunkt erneut.',
        },
        NotSupportedError: {
          header: 'Aktion nicht unterstützt',
          message: 'Die angeforderte Aktion wird nicht unterstützt.',
        },
        TimeoutError: {
          header: 'Zeitüberschreitung der Anfrage',
          message: 'Der Server hat zu lange für eine Antwort gebraucht. Bitte überprüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.',
        },
        UnauthorizedError: {
          header: 'Anmeldung erforderlich',
          message: 'Sie müssen angemeldet sein, um diese Aktion auszuführen. Bitte melden Sie sich an.',
        },
        HttpError: {
          header: (error) => (
            (isDefined(error.response) && error.response.statusCode != 0)
              ? `Fehler ${error.response.statusCode.toString()}`
              : 'Verbindungsfehler'
          ),
          message: getHttpErrorMessage,
        },
        SecretRequirementsError: {
          header: 'Passwort zu schwach',
          message: getErrorMessage,
        },
      },
    },
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
      [HttpErrorReason.Timeout]: 'Zeitüberschreitung',
    }),
  ],
};

export const englishTstdlErrorsLocalization: ErrorsLocalization<TstdlErrors> = {
  language: { code: 'en', name: 'English' },
  keys: {
    tstdl: {
      errors: {
        ApiError: {
          header: 'A Server Error Occurred',
          message: 'Please try again in a moment. If the problem persists, please contact support.',
        },
        BadRequestError: {
          header: 'Invalid Information',
          message: 'Please check the information you entered and try again.',
        },
        ForbiddenError: {
          header: 'Permission Denied',
          message: 'You do not have the necessary permissions to perform this action.',
        },
        InvalidCredentialsError: {
          header: 'Invalid Credentials',
          message: 'The username or password you entered is incorrect. Please check your details.',
        },
        InvalidTokenError: {
          header: 'Session Expired',
          message: 'Your session has expired or is invalid. Please log in again.',
        },
        MaxBytesExceededError: {
          header: 'File Too Large',
          message: 'The selected file exceeds the maximum allowed size.',
        },
        MethodNotAllowedError: {
          header: 'Unexpected Error',
          message: 'An internal error occurred. Please try again later.',
        },
        NotFoundError: {
          header: 'Not Found',
          message: 'The item you are looking for could not be found. It may have been moved or deleted.',
        },
        NotImplementedError: {
          header: 'Feature Not Available',
          message: 'This feature is not yet available. Please check back later.',
        },
        NotSupportedError: {
          header: 'Unsupported Action',
          message: 'The requested action is not supported.',
        },
        TimeoutError: {
          header: 'Request Timed Out',
          message: 'The server took too long to respond. Please check your internet connection and try again.',
        },
        UnauthorizedError: {
          header: 'Authentication Required',
          message: 'You must be logged in to perform this action. Please log in.',
        },
        HttpError: {
          header: (error) => (
            (isDefined(error.response) && error.response.statusCode != 0)
              ? `Error ${error.response.statusCode.toString()}`
              : 'Connection Error'
          ),
          message: getHttpErrorMessage,
        },
        SecretRequirementsError: {
          header: 'Password Is Too Weak',
          message: getErrorMessage,
        },
      },
    },
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
      [HttpErrorReason.Timeout]: 'Timeout',
    }),
  ],
};

function getHttpErrorMessage(error: HttpError, context: LocalizeFunctionContext): string {
  if (isDefined(error.response) && isNotNull(error.response.statusMessage)) {
    return error.response.statusMessage;
  }

  return context.localizationService.localizeOnce({ enum: HttpErrorReason, value: error.reason });
}

function getErrorMessage(error: Error): string {
  return error.message.replace(/\.$/u, '');
}
