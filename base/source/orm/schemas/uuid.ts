import { Property, StringSchema, type SchemaPropertyDecorator, type SchemaPropertyDecoratorOptions } from '#/schema/index.js';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;

export type UuidSchemaOptions = {
  defaultRandom?: boolean
};

export class UuidSchema extends StringSchema {
  override readonly name = 'uuid';

  readonly defaultRandom: boolean;

  constructor(options?: UuidSchemaOptions) {
    super({ pattern: uuidPattern });

    this.defaultRandom = options?.defaultRandom ?? false;
  }
}

export function uuid(options?: UuidSchemaOptions): UuidSchema {
  return new UuidSchema(options);
}

export function Uuid(options?: UuidSchemaOptions & SchemaPropertyDecoratorOptions): SchemaPropertyDecorator {
  return Property(uuid(options), options);
}
