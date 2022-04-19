import { SchemaError } from '#/schema';
import { ValidationError } from '../error/validation.error';

export type SerializedValidationError = {
  message: string,
  details?: any,
  inner?: SerializedValidationError[]
};

export type SerializedSchemaError = {
  message: string,
  details?: any,
  path: string
};

/**
 * @deprecated noop, handlers are registered by default
 */
export function registerDefaultErrorHandlers(): void { /* noop */ }

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

export function serializeSchemaError(error: SchemaError): SerializedSchemaError {
  return {
    message: error.message,
    details: error.details,
    path: error.path
  };
}

export function deserializeSchemaError(serializedError: SerializedSchemaError): SchemaError {
  return new SchemaError(serializedError.message, { details: serializedError.details, path: serializedError.path });
}
