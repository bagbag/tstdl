import { createDecorator, type Decorator, type PropertyMetadata } from '#/reflection/index.js';
import { any, Class, ObjectSchema, type ObjectSchemaOptions, Property, type SchemaPropertyDecoratorOptions } from '#/schema/index.js';
import type { Constructor } from '#/types.js';

export type JsonSchemaOptions = Pick<ObjectSchemaOptions, 'factory'>;

export class JsonSchema extends ObjectSchema {
  override readonly name = 'Json';

  constructor(options?: JsonSchemaOptions) {
    super({}, { ...options, unknownPropertiesKey: any(), unknownProperties: any() });
  }
}

export function json(options?: JsonSchemaOptions): JsonSchema {
  return new JsonSchema(options);
}

export function Json(options?: JsonSchemaOptions & SchemaPropertyDecoratorOptions): Decorator<'class' | 'property' | 'accessor'> {
  return createDecorator({ class: true, property: true, accessor: true }, (data, metadata, args) => {
    if (data.type == 'class') {
      return Class({ schema: json({ factory: { type: data.constructor as Constructor } }) })(args[0] as Constructor);
    }

    return Property(json({ factory: { type: (metadata as PropertyMetadata).type as Constructor } }), options)(args[0], args[1]!, args[2]!);
  });
}
