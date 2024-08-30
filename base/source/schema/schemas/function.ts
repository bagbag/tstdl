import { isFunction } from '#/utils/type-guards.js';
import { Property, type SchemaPropertyDecorator, type SchemaPropertyDecoratorOptions } from '../decorators/index.js';
import { SimpleSchema, type SimpleSchemaOptions } from './simple.js';

export type FunctionSchemaOptions = SimpleSchemaOptions;

export class FunctionSchema extends SimpleSchema<Function> {
  override readonly name = 'function';

  constructor(options?: FunctionSchemaOptions) {
    super('function', isFunction, options);
  }
}

export function func(): FunctionSchema {
  return new FunctionSchema();
}

export function FunctionProperty(options?: SchemaPropertyDecoratorOptions): SchemaPropertyDecorator {
  return Property(func(), options);
}
