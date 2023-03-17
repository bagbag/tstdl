import { SchemaError } from '#/schema/index.js';
import type { OneOrMany } from '#/types.js';
import { isArray, isDefined } from '#/utils/type-guards.js';

export type SerializedSchemaError = {
  path: string,
  details?: any,
  inner?: OneOrMany<SerializedInnerSchemaError>
};

export type SerializedInnerSchemaError = SerializedSchemaError & {
  message: string
};

export function serializeSchemaError(error: SchemaError): SerializedSchemaError {
  return {
    path: error.path,
    details: error.details,
    inner: isDefined(error.inner) ? isArray(error.inner) ? error.inner.map(serializeInnerSchemaError) : serializeInnerSchemaError(error.inner) : undefined
  };
}

export function serializeInnerSchemaError(error: SchemaError): SerializedInnerSchemaError {
  return {
    message: error.message,
    ...serializeSchemaError(error)
  };
}

export function deserializeSchemaError(message: string, data: SerializedSchemaError): SchemaError {
  const inner = isDefined(data.inner) ? isArray(data.inner) ? data.inner.map(deserializeInnerSchemaError) : deserializeInnerSchemaError(data.inner) : undefined;
  return new SchemaError(message, { path: data.path, details: data.details, inner });
}

export function deserializeInnerSchemaError(data: SerializedInnerSchemaError): SchemaError {
  return deserializeSchemaError(data.message, data);
}
