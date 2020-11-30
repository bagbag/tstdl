import { NotFoundError, UnauthorizedError } from '../error';
import { ValidationError } from '../error/validation';
import { registerErrorHandler } from './response';

type SerializedValidationError = {
  message: string,
  details?: any,
  inner?: SerializedValidationError[]
};

export function registerDefaultErrorHandlers(): void {
  registerErrorHandler(ValidationError, 400, ({ message, details }) => ({ message, details }), ({ message, details }) => new ValidationError(message, details));
  registerErrorHandler(NotFoundError, 404, () => undefined, (_, error) => new NotFoundError(error.message));
  registerErrorHandler(UnauthorizedError, 401, () => undefined, (_, error) => new UnauthorizedError(error.message));
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
