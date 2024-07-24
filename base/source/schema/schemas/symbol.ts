import type { JsonPath } from '#/json-path/json-path.js';
import { SchemaError } from '#/schema/schema.error.js';
import { isSymbol } from '#/utils/type-guards.js';
import { typeOf } from '#/utils/type-of.js';
import { Property, type SchemaPropertyDecorator, type SchemaPropertyDecoratorOptions } from '../decorators/index.js';
import { Schema, type SchemaTestOptions, type SchemaTestResult } from '../schema.js';

export class SymbolSchema extends Schema<symbol> {
  override _test(value: any, path: JsonPath, options: SchemaTestOptions): SchemaTestResult<symbol> {
    if (isSymbol(value)) {
      return { valid: true, value };
    }

    return { valid: false, error: SchemaError.expectedButGot('symbol', typeOf(value), path, { fast: options.fastErrors }) };
  }
}

export function symbol(): SymbolSchema {
  return new SymbolSchema();
}

export function SymbolProperty(options?: SchemaPropertyDecoratorOptions): SchemaPropertyDecorator {
  return Property(symbol(), options);
}
