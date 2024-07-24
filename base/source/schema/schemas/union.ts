import type { JsonPath } from '#/json-path/json-path.js';
import { Property, type SchemaPropertyDecorator, type SchemaPropertyDecoratorOptions } from '../decorators/index.js';
import { Schema, type SchemaOutput, type SchemaTestable, type SchemaTestOptions, type SchemaTestResult } from '../schema.js';
import { isSchemaTestable, schemaTestableToSchema } from '../testable.js';

type UnionSchemaType<T extends [SchemaTestable, ...SchemaTestable[]]> = T[number] extends SchemaTestable<infer V> ? V : never;

export class UnionSchema<T extends [SchemaTestable, ...SchemaTestable[]]> extends Schema<UnionSchemaType<T>> {
  readonly schemas: { [P in keyof T]: T[P] extends Schema ? T[P] : Schema<SchemaOutput<T[P]>> };

  constructor(schemas: T) {
    super();

    this.schemas = schemas.map((schema) => schemaTestableToSchema(schema)) as { [P in keyof T]: T[P] extends Schema ? T[P] : Schema<SchemaOutput<T[P]>> };
  }

  override _test(value: any, path: JsonPath, options: SchemaTestOptions): SchemaTestResult<UnionSchemaType<T>> {
    let firstInvalidResult: SchemaTestResult<UnionSchemaType<T>> | undefined;

    for (const schema of this.schemas) {
      const result = schema._test(value, path, options) as SchemaTestResult<UnionSchemaType<T>>;

      if (result.valid) {
        return result;
      }

      firstInvalidResult ??= result;
    }

    return firstInvalidResult!;
  }
}

export function union<T extends [SchemaTestable, ...SchemaTestable[]]>(...schemas: T): UnionSchema<T> {
  return new UnionSchema(schemas);
}

export function Union(...schemasAndOptions: [SchemaTestable, ...SchemaTestable[]] | [SchemaTestable, ...SchemaTestable[], options: SchemaPropertyDecoratorOptions]): SchemaPropertyDecorator {
  const schemaOrOptions = schemasAndOptions.at(-1)!;

  if (isSchemaTestable(schemaOrOptions)) {
    return Property(union(...schemasAndOptions as [SchemaTestable, ...SchemaTestable[]]));
  }

  const schemas = schemasAndOptions.slice(0, -1);
  return Property(union(...schemas as [SchemaTestable, ...SchemaTestable[]]), schemaOrOptions);
}
