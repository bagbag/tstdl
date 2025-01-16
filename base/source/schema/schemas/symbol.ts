import { isSymbol } from '#/utils/type-guards.js';
import { PropertySchema, type SchemaPropertyDecorator, type SchemaDecoratorOptions } from '../decorators/index.js';
import { SimpleSchema, type SimpleSchemaOptions } from './simple.js';

export type SymbolSchemaOptions = SimpleSchemaOptions<symbol>;

export class SymbolSchema extends SimpleSchema<symbol> {
  override readonly name = 'symbol';

  constructor(options?: SymbolSchemaOptions) {
    super('symbol', isSymbol, options);
  }
}

export function symbol(options?: SymbolSchemaOptions): SymbolSchema {
  return new SymbolSchema(options);
}

export function SymbolProperty(options?: SymbolSchemaOptions & SchemaDecoratorOptions): SchemaPropertyDecorator {
  return PropertySchema((data) => symbol({ description: data.description, example: data.example, ...options }), options);
}
