import { BadRequestError, ForbiddenError, InvalidTokenError, MaxBytesExceededError, NotFoundError, NotImplementedError, UnauthorizedError, UnsupportedMediaTypeError } from '../error';
import { ApiError } from '../error/api.error';
import { ValidationError } from '../error/validation.error';
import { registerErrorHandler } from './response';

type SerializedValidationError = {
  message: string,
  details?: any,
  inner?: SerializedValidationError[]
};

export function registerDefaultErrorHandlers(): void {
  registerErrorHandler(ApiError, 400, ({ response }) => response, (response) => new ApiError(response));
  registerErrorHandler(BadRequestError, 400, () => undefined, (_, error) => new BadRequestError(error.message));
  registerErrorHandler(ForbiddenError, 403, () => undefined, (_, error) => new ForbiddenError(error.message));
  registerErrorHandler(InvalidTokenError, 401, () => undefined, (_, error) => new InvalidTokenError(error.message));
  registerErrorHandler(MaxBytesExceededError, 400, () => undefined, (_, error) => new MaxBytesExceededError(error.message));
  registerErrorHandler(NotFoundError, 404, () => undefined, (_, error) => new NotFoundError(error.message));
  registerErrorHandler(NotImplementedError, 404, () => undefined, (_, error) => new NotImplementedError(error.message));
  registerErrorHandler(UnauthorizedError, 401, () => undefined, (_, error) => new UnauthorizedError(error.message));
  registerErrorHandler(UnsupportedMediaTypeError, 415, () => undefined, (_, error) => new UnsupportedMediaTypeError(error.message));
  registerErrorHandler(ValidationError, 400, serializeValidationError, deserializeValidationError);
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
