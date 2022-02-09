import type { JsonPath } from '#/json-path';
import { isPromise } from '#/utils/type-guards';
import { SchemaError } from '../schema.error';
import type { DefinedValidationOptions, ValidationTestResult } from '../schema.validator';
import { SchemaValidator, test, testAsync } from '../schema.validator';
import type { SchemaDefinition, SchemaInput, SchemaOptions, SchemaOutput } from '../types';
import { schemaHelper } from '../types';

export type RefineResult =
  | { valid: true, error?: undefined }
  | { valid: false, error: SchemaError | string };

export type Refiner<T> = (value: T, path: JsonPath) => RefineResult | Promise<RefineResult>;

export type RefineSchemaDefinition<S extends SchemaDefinition = SchemaDefinition> = SchemaDefinition<'refine', SchemaInput<S>, SchemaOutput<S>> & {
  inputSchema: S,
  refiner: Refiner<SchemaOutput<S>>
};

export class RefineSchemaValidator<T extends SchemaDefinition> extends SchemaValidator<RefineSchemaDefinition<T>> {
  private readonly inputValidator: SchemaValidator<T>;

  constructor(schema: RefineSchemaDefinition<T>, inputValidator: SchemaValidator<T>) {
    super(schema);

    this.inputValidator = inputValidator;
  }

  [test](value: unknown, options: DefinedValidationOptions, path: JsonPath): ValidationTestResult<SchemaOutput<T>> {
    const inputTestResult = this.inputValidator[test](value as SchemaInput<T>, options, path);

    if (!inputTestResult.valid) {
      return inputTestResult;
    }

    const refineResult = this.schema.refiner(inputTestResult.value, path);

    if (isPromise(refineResult)) {
      throw new Error(`cannot handle async refine in sync validation. Use async instead (path: ${path.path})`);
    }

    if (!refineResult.valid) {
      const error = (refineResult.error instanceof SchemaError) ? refineResult.error : new SchemaError(refineResult.error, { path });
      return { valid: false, error };
    }

    return { valid: true, value: inputTestResult.value };
  }

  protected async [testAsync](value: unknown, options: DefinedValidationOptions, path: JsonPath): Promise<ValidationTestResult<SchemaOutput<T>>> {
    const inputTestResult = await this.inputValidator[testAsync](value as SchemaInput<T>, options, path);

    if (!inputTestResult.valid) {
      return inputTestResult;
    }

    const refineResult = await this.schema.refiner(inputTestResult.value, path);

    if (!refineResult.valid) {
      const error = (refineResult.error instanceof SchemaError) ? refineResult.error : new SchemaError(refineResult.error, { path });
      return { valid: false, error };
    }

    return { valid: true, value: inputTestResult.value };
  }
}

export function refine<T extends SchemaDefinition>(inputSchemaValidator: SchemaValidator<T>, refiner: Refiner<SchemaOutput<T>>, options?: SchemaOptions<RefineSchemaDefinition<T>, 'inputSchema' | 'refiner'>): RefineSchemaValidator<T> {
  const schema = schemaHelper<RefineSchemaDefinition<T>>({
    type: 'refine',
    inputSchema: inputSchemaValidator.schema,
    refiner,
    ...options
  });

  return new RefineSchemaValidator(schema, inputSchemaValidator);
}
