import type { JsonPath } from '#/json-path';
import { isPromise } from '#/utils/type-guards';
import type { DefinedValidationOptions, ValidationTestResult } from '../schema.validator';
import { SchemaValidator, test, testAsync } from '../schema.validator';
import type { Schema, SchemaInput, SchemaOptions, SchemaOutput } from '../types';
import { schemaHelper } from '../types';

export type Preprocessor<S extends Schema, Input> = (value: Input) => SchemaInput<S> | Promise<SchemaInput<S>>;

export type PreprocessSchema<S extends Schema = Schema, Input = never> = Schema<'preprocess', Input, SchemaOutput<S>> & {
  outputSchema: S,
  preprocessor: Preprocessor<S, Input>
};

export class PreprocessSchemaValidator<T extends Schema, Input = never> extends SchemaValidator<PreprocessSchema<T, Input>> {
  private readonly outputValidator: SchemaValidator<T>;

  constructor(schema: PreprocessSchema<T, Input>, outputValidator: SchemaValidator<T>) {
    super(schema);

    this.outputValidator = outputValidator;
  }

  [test](value: Input, options: DefinedValidationOptions, path: JsonPath): ValidationTestResult<SchemaOutput<T>> {
    const preprocessed = this.schema.preprocessor(value);

    if (isPromise(preprocessed)) {
      throw new Error(`cannot handle async preprocess in sync validation. Use async instead (path: ${path.path})`);
    }

    return this.outputValidator[test](preprocessed, options, path);
  }

  protected async [testAsync](value: Input, options: DefinedValidationOptions, path: JsonPath): Promise<ValidationTestResult<SchemaOutput<T>>> {
    const preprocessed = await this.schema.preprocessor(value);
    return this.outputValidator[testAsync](preprocessed, options, path);
  }
}

export function preprocess<T extends Schema, Input>(outputSchemaValidator: SchemaValidator<T>, preprocessor: Preprocessor<T, Input>, options?: SchemaOptions<PreprocessSchema<T, Input>, 'outputSchema' | 'preprocessor'>): PreprocessSchemaValidator<T, Input> {
  const schema = schemaHelper<PreprocessSchema<T, Input>>({
    type: 'preprocess',
    outputSchema: outputSchemaValidator.schema,
    preprocessor,
    ...options
  });

  return new PreprocessSchemaValidator(schema, outputSchemaValidator);
}
