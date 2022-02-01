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
  coerce?: boolean
};

export type Maskable = {
  mask?: boolean
};

export function schemaHelper<T extends Schema>(schema: TypedOmit<T, typeof schemaTypes>): T {
  return schema as T;
}
