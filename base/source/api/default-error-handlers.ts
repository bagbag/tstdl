import { SchemaError } from '#/schema';

export type SerializedSchemaError = {
  message: string,
  details?: any,
  path: string
};

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
