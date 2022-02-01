import type { JsonPath } from '#/json-path';
import { isPromise } from '#/utils/type-guards';
import type { DefinedValidationOptions, ValidationTestResult } from '../schema.validator';
import { SchemaValidator, test, testAsync } from '../schema.validator';
import type { Schema, SchemaInput, SchemaOptions, SchemaOutput } from '../types';
import { schemaHelper } from '../types';

export type Transformer<T extends Schema, Output> = (value: SchemaOutput<T>) => Output | Promise<Output>;

export type TransformSchema<T extends Schema = Schema, Output = unknown> = Schema<'transform', SchemaInput<T>, Output> & {
  inputSchema: T,
  transformer: Transformer<T, Output>
};

export class TransformSchemaValidator<T extends Schema, Output> extends SchemaValidator<TransformSchema<T, Output>> {
  private readonly inputValidator: SchemaValidator<T>;

  constructor(schema: TransformSchema<T, Output>, inputValidator: SchemaValidator<T>) {
    super(schema);

    this.inputValidator = inputValidator;
  }

  [test](value: unknown, options: DefinedValidationOptions, path: JsonPath): ValidationTestResult<Output> {
    const inputTestResult = this.inputValidator[test](value as SchemaInput<T>, options, path);

    if (!inputTestResult.valid) {
      return inputTestResult;
    }

    const transformed = this.schema.transformer(inputTestResult.value);

    if (isPromise(transformed)) {
      throw new Error(`cannot handle async transform in sync validation. Use async instead (path: ${path.path})`);
    }

    return { valid: true, value: transformed };
  }

  protected async [testAsync](value: unknown, options: DefinedValidationOptions, path: JsonPath): Promise<ValidationTestResult<Output>> {
    const inputTestResult = await this.inputValidator[testAsync](value as SchemaInput<T>, options, path);

    if (!inputTestResult.valid) {
      return inputTestResult;
    }

    const transformed = await this.schema.transformer(inputTestResult.value);

    return { valid: true, value: transformed };
  }
}

export function transform<T extends Schema, Output>(inputSchemaValidator: SchemaValidator<T>, transformer: Transformer<T, Output>, options?: SchemaOptions<TransformSchema<T, Output>, 'inputSchema' | 'transformer'>): TransformSchemaValidator<T, Output> {
  const schema = schemaHelper<TransformSchema<T, Output>>({
    type: 'transform',
    inputSchema: inputSchemaValidator.schema,
    transformer,
    ...options
  });

  return new TransformSchemaValidator(schema, inputSchemaValidator);
}
