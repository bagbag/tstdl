import type { JsonPath } from '#/json-path';
import type { DefinedValidationOptions, ValidationTestResult } from '../schema.validator';
import { SchemaValidator, test } from '../schema.validator';
import type { SchemaDefinition, SchemaOptions, SchemaOutput } from '../types';
import { schemaHelper } from '../types';
import { instance } from './instance';

export type ReadableStreamSchemaDefinition = SchemaDefinition<'readableStream', unknown, ReadableStream>;

const readableStreamInstanceSchema = (typeof ReadableStream != 'function' ? undefined : instance(ReadableStream))!;

export class ReadableStreamSchemaValidator extends SchemaValidator<ReadableStreamSchemaDefinition> {
  [test](value: unknown, options: DefinedValidationOptions, path: JsonPath): ValidationTestResult<SchemaOutput<ReadableStreamSchemaDefinition>> {
    return readableStreamInstanceSchema[test](value, options, path);
  }
}

export function readableStream(options?: SchemaOptions<ReadableStreamSchemaDefinition>): ReadableStreamSchemaValidator {
  const schema = schemaHelper<ReadableStreamSchemaDefinition>({
    type: 'readableStream',
    ...options
  });

  return new ReadableStreamSchemaValidator(schema);
}
