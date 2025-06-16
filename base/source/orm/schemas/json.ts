import type { JsonPath } from '#/json-path/json-path.js';
import { createDecorator, type Decorator, type PropertyMetadata } from '#/reflection/index.js';
import { any, Class, object, Property, Schema, type SchemaDecoratorOptions, type SchemaTestable, schemaTestableToSchema, type SchemaTestOptions, type SchemaTestResult } from '#/schema/index.js';
import type { Constructor, TypedOmit } from '#/types.js';
import { isDefined } from '#/utils/type-guards.js';

export type JsonSchemaOptions<T> = { schema?: SchemaTestable<T> };

export class JsonSchema<T> extends Schema<T> {
  readonly name = 'Json';
  readonly innerSchema: Schema<T>;

  constructor(options?: JsonSchemaOptions<T>) {
    super();

    this.innerSchema = isDefined(options?.schema) ? schemaTestableToSchema(options.schema) : any();
  }

  override _test(value: any, path: JsonPath, options: SchemaTestOptions): SchemaTestResult<T> {
    return this.innerSchema._test(value, path, options);
  }
}

export function json<T>(options?: JsonSchemaOptions<T>): JsonSchema<T> {
  return new JsonSchema(options);
}

export function Json(options?: JsonSchemaOptions<any> & TypedOmit<SchemaDecoratorOptions, 'schema'>): Decorator<'class' | 'property' | 'accessor'> {
  const { schema, ...optionsRest } = options ?? {};

  return createDecorator({ class: true, property: true, accessor: true }, (data, metadata, args) => {
    if (data.type == 'class') {
      return Class({ schema: json({ schema: schema ?? object({}, { unknownPropertiesKey: any(), unknownProperties: any(), factory: { type: data.constructor as Constructor } }) }) })(args[0] as Constructor);
    }

    return Property(json({ schema: schema ?? object({}, { unknownPropertiesKey: any(), unknownProperties: any(), factory: { type: (metadata as PropertyMetadata).type as Constructor } }) }), optionsRest)(args[0], args[1]!, args[2]!);
  });
}
