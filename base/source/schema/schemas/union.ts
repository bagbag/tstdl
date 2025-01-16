import type { JsonPath } from '#/json-path/json-path.js';
import { lazyProperty } from '#/utils/object/lazy-property.js';
import { PropertySchema, type SchemaPropertyDecorator, type SchemaDecoratorOptions } from '../decorators/index.js';
import { SchemaError } from '../schema.error.js';
import { Schema, type SchemaOutput, type SchemaTestable, type SchemaTestOptions, type SchemaTestResult } from '../schema.js';
import { isSchemaTestable, schemaTestableToSchema } from '../testable.js';

type UnionSchemaType<T extends [SchemaTestable, ...SchemaTestable[]]> = T[number] extends SchemaTestable<infer V> ? V : never;

export class UnionSchema<T extends [SchemaTestable, ...SchemaTestable[]]> extends Schema<UnionSchemaType<T>> {
  override readonly name: string;

  readonly schemas: { [P in keyof T]: T[P] extends Schema ? T[P] : Schema<SchemaOutput<T[P]>> };

  constructor(schemas: T) {
    super();

    this.schemas = schemas.flatMap((testable) => {
      const schema = schemaTestableToSchema(testable);

      if (schema instanceof UnionSchema) {
        return schema.schemas as Schema<UnionSchemaType<T>>[];
      }

      return schema;
    }) as { [P in keyof T]: T[P] extends Schema ? T[P] : Schema<SchemaOutput<T[P]>> };

    lazyProperty(this, 'name', () => `Union[${this.schemas.map((schema) => schema.name).join(', ')}]`);
  }

  override _test(value: any, path: JsonPath, options: SchemaTestOptions): SchemaTestResult<UnionSchemaType<T>> {
    const errors: SchemaError[] = [];

    for (const schema of this.schemas) {
      const result = schema._test(value, path, options) as SchemaTestResult<UnionSchemaType<T>>;

      if (result.valid) {
        return result;
      }

      errors.push(result.error);
    }

    return { valid: false, error: new SchemaError(`None of the schemas [${this.schemas.map((schema) => schema.name).join(', ')}] matched. See inner for details.`, { path, inner: errors, fast: options.fastErrors }) };
  }
}

export function union<T extends [SchemaTestable, ...SchemaTestable[]]>(...schemas: T): UnionSchema<T> {
  return new UnionSchema(schemas);
}

export function Union(...schemasAndOptions: [SchemaTestable, ...SchemaTestable[]] | [SchemaTestable, ...SchemaTestable[], options: SchemaDecoratorOptions]): SchemaPropertyDecorator {
  const schemaOrOptions = schemasAndOptions.at(-1)!;

  if (isSchemaTestable(schemaOrOptions)) {
    return PropertySchema(() => union(...schemasAndOptions as [SchemaTestable, ...SchemaTestable[]]));
  }

  const schemas = schemasAndOptions.slice(0, -1);
  return PropertySchema(() => union(...schemas as [SchemaTestable, ...SchemaTestable[]]), schemaOrOptions);
}
