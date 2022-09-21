import type { JsonPath } from '#/json-path';
import { SchemaError } from '../schema.error';
import type { DefinedValidationOptions, ValidationTestResult } from '../schema.validator';
import { SchemaValidator, test, testAsync } from '../schema.validator';
import type { SchemaDefinition, SchemaInput, SchemaOptions, SchemaOutput } from '../types';
import { schemaHelper } from '../types';

export type UnionSchemaInput<A extends SchemaDefinition, B extends SchemaDefinition[]> = SchemaInput<A> | SchemaInput<B[number]>;
export type UnionSchemaOutput<A extends SchemaDefinition, B extends SchemaDefinition[]> = SchemaOutput<A> | SchemaOutput<B[number]>;

export type UnionSchemaDefinition<A extends SchemaDefinition, B extends SchemaDefinition[]> = SchemaDefinition<'union', UnionSchemaInput<A, B>, UnionSchemaOutput<A, B>> & {
  schemas: [A, ...B]
};

export class UnionSchemaValidator<A extends SchemaDefinition, B extends SchemaDefinition[]> extends SchemaValidator<UnionSchemaDefinition<A, B>> {
  private readonly innerSchemaTypesString: string;

  readonly innerSchemas: [SchemaValidator<A>, ...SchemaValidator<B[number]>[]];

  constructor(innerSchemas: [SchemaValidator<A>, ...SchemaValidator<B[number]>[]], schema: UnionSchemaDefinition<A, B>) {
    super(schema);

    this.innerSchemas = innerSchemas;
    this.innerSchemaTypesString = this.innerSchemas.map((innerSchema) => innerSchema.schema.type).join(', ');
  }

  [test](value: unknown, options: DefinedValidationOptions, path: JsonPath): ValidationTestResult<UnionSchemaOutput<A, B>> {
    const errors: SchemaError[] = [];

    for (const schema of this.innerSchemas) {
      const result = schema.test(value as SchemaInput<this>, options);

      if (result.valid) {
        return result;
      }

      errors.push(result.error);
    }

    return { valid: false, error: new SchemaError(`Value did not match any of the allowed schemas (${this.innerSchemaTypesString})`, { path, inner: errors }) };
  }

  protected async [testAsync](value: unknown, options: DefinedValidationOptions, path: JsonPath): Promise<ValidationTestResult<UnionSchemaOutput<A, B>>> {
    const errors: SchemaError[] = [];

    for (const schema of this.innerSchemas) {
      const result = await schema.testAsync(value as SchemaInput<this>, options);

      if (result.valid) {
        return result;
      }

      errors.push(result.error);
    }

    return { valid: false, error: new SchemaError(`Value did not match any of the allowed schemas (${this.innerSchemaTypesString})`, { path, inner: errors }) };
  }
}

export function union<A extends SchemaValidator, B extends SchemaValidator[]>(schemas: [A, ...B], options?: SchemaOptions<UnionSchemaDefinition<A['schema'], B[number]['schema'][]>, 'schemas'>): UnionSchemaValidator<A['schema'], B[number]['schema'][]> {
  const schema = schemaHelper<UnionSchemaDefinition<A['schema'], B[number]['schema'][]>>({
    type: 'union',
    schemas: schemas.map((innerSchema) => innerSchema.schema) as [A['schema'], B[number]['schema']],
    ...options
  });

  return new UnionSchemaValidator(schemas, schema);
}
