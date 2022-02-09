import type { Simplify, TypedOmit } from '#/types';
import type { SchemaValidator } from './schema.validator';

declare const schemaTypes: unique symbol;

export type SchemaDefinition<Type extends string = string, Input = unknown, Output = unknown> = {
  type: Type,
  [schemaTypes]?: { input: Input, output: Output }
};

export type Schema<T> = SchemaValidator<SchemaDefinition<string, unknown, T>>;

export type SchemaOptions<T extends SchemaDefinition, K extends keyof T = never> = Simplify<Partial<TypedOmit<T, keyof SchemaDefinition | K>>>;

export type SchemaInput<T extends SchemaDefinition | SchemaValidator> =
  T extends SchemaDefinition<string, infer I, any> ? I
  : T extends SchemaValidator ? T['inputType']
  : never;

export type SchemaOutput<T extends SchemaDefinition | SchemaValidator> =
  T extends SchemaDefinition<string, any, infer O> ? O
  : T extends SchemaValidator ? T['outputType']
  : never;

export type Coercible = {
  /**
   * try to convert wrong input into desired output.
   * Can be specified on definition and validation. If specified on both, definition has higher priority
   */
  coerce?: boolean
};

export type Maskable = {
  /**
   * remove unspecified fields on input data instead of raising an error.
   * Can be specified on definition and validation. If specified on both, definition has higher priority
   */
  mask?: boolean
};

export function schemaHelper<T extends SchemaDefinition>(schema: TypedOmit<T, typeof schemaTypes>): T {
  return schema as T;
}
