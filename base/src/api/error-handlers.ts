import { BadRequestError, ForbiddenError, MaxBytesExceededError, NotFoundError, UnauthorizedError, UnsupportedMediaTypeError } from '../error';
import { ApiError } from '../error/api';
import { ValidationError } from '../error/validation';
import { registerErrorHandler } from './response';

type SerializedValidationError = {
  message: string,
  details?: any,
  inner?: SerializedValidationError[]
};

export function registerDefaultErrorHandlers(): void {
  registerErrorHandler(ValidationError, 400, serializeValidationError, deserializeValidationError);
  registerErrorHandler(ApiError, 400, ({ response }) => response, (response) => new ApiError(response));
  registerErrorHandler(MaxBytesExceededError, 400, () => undefined, (_, error) => new MaxBytesExceededError(error.message));
  registerErrorHandler(UnsupportedMediaTypeError, 415, () => undefined, (_, error) => new UnsupportedMediaTypeError(error.message));
  registerErrorHandler(BadRequestError, 400, () => undefined, (_, error) => new BadRequestError(error.message));
  registerErrorHandler(UnauthorizedError, 401, () => undefined, (_, error) => new UnauthorizedError(error.message));
  registerErrorHandler(ForbiddenError, 403, () => undefined, (_, error) => new ForbiddenError(error.message));
  registerErrorHandler(NotFoundError, 404, () => undefined, (_, error) => new NotFoundError(error.message));
}

export function serializeValidationError(error: ValidationError): SerializedValidationError {
  return {
    message: error.message,
    details: error.details,
    inner: error.inner?.map(serializeValidationError)
  };
}

export function deserializeValidationError(serializedError: SerializedValidationError): ValidationError {
  const inner = serializedError.inner?.map(deserializeValidationError);
  return new ValidationError(serializedError.message, { details: serializedError.details, inner });
}
