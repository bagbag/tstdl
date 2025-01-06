/* eslint-disable @typescript-eslint/no-unsafe-function-type */

import { isFunction } from '#/utils/type-guards.js';
import { PropertySchema, type SchemaPropertyDecorator, type SchemaPropertyDecoratorOptions } from '../decorators/index.js';
import { SimpleSchema, type SimpleSchemaOptions } from './simple.js';

export type FunctionSchemaOptions = SimpleSchemaOptions<Function>;

export class FunctionSchema extends SimpleSchema<Function> {
  override readonly name = 'function';

  constructor(options?: FunctionSchemaOptions) {
    super('function', isFunction, options);
  }
}

export function func(options?: FunctionSchemaOptions): FunctionSchema {
  return new FunctionSchema(options);
}

export function FunctionProperty(options?: FunctionSchemaOptions & SchemaPropertyDecoratorOptions): SchemaPropertyDecorator {
  return PropertySchema((data) => func({ description: data.description, example: data.example, ...options }), options);
}
