import type { Simplify, TypedOmit } from '#/types';

declare const schemaTypes: unique symbol;

export type Schema<Type extends string = string, Input = unknown, Output = unknown> = {
  type: Type,
  [schemaTypes]?: { input: Input, output: Output }
};

export type SchemaOptions<T extends Schema, K extends keyof T = never> = Simplify<Partial<TypedOmit<T, keyof Schema | K>>>;

export type SchemaInput<T extends Schema> = T extends Schema<string, infer I, any> ? I : never;

export type SchemaOutput<T extends Schema> = T extends Schema<string, any, infer O> ? O : never;

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

export function schemaHelper<T extends Schema>(schema: TypedOmit<T, typeof schemaTypes>): T {
  return schema as T;
}
