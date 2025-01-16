import { NumberSchema, type NumberSchemaOptions, Property, type SchemaPropertyDecorator, type SchemaDecoratorOptions, type SimpleSchemaOptions } from '#/schema/index.js';

export type NumericDateSchemaOptions = SimpleSchemaOptions<number> & Pick<NumberSchemaOptions, 'minimum' | 'maximum'>;

export class NumericDateSchema extends NumberSchema {
  override readonly name = 'NumericDate';

  constructor(options?: NumericDateSchemaOptions) {
    super({ ...options, integer: true });
  }
}

export function numericDate(options?: NumericDateSchemaOptions): NumericDateSchema {
  return new NumericDateSchema(options);
}

export function NumericDate(options?: NumericDateSchemaOptions & SchemaDecoratorOptions): SchemaPropertyDecorator {
  return Property(numericDate(options), options);
}
