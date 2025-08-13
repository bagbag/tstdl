/* eslint-disable @typescript-eslint/no-unsafe-function-type */

import { reflectionRegistry } from '#/reflection/registry.js';
import { createMethodDecorator } from '#/reflection/utils.js';
import type { AbstractConstructor, Function } from '#/types/index.js';
import { isArray, isDefined, isFunction, isNull, isUndefined } from '#/utils/type-guards.js';
import { type CombinedSchemaDecorator, createSchemaDecorator, Property, type SchemaDecoratorOptions, type SchemaReflectionData } from '../decorators/index.js';
import { schemaReflectionDataToSchema } from '../decorators/utils.js';
import type { Schema, SchemaTestable } from '../schema.js';
import { schemaTestableToSchema } from '../testable.js';
import { never } from './never.js';
import { optional } from './optional.js';
import { SimpleSchema, type SimpleSchemaOptions } from './simple.js';

export type FunctionSchemaOptions<T extends Function> = SimpleSchemaOptions<T> & { parameterNames?: (string | null)[] };

type MappedParameters<T> = { [I in keyof T]: SchemaTestable<T[I]> };

export class FunctionSchema<T extends (...args: any[]) => any> extends SimpleSchema<T> {
  override readonly name = 'function';

  readonly parameterSchemas: MappedParameters<Parameters<T>> | null;
  readonly parameterNames: (string | null)[];
  readonly returnValueSchema: SchemaTestable<ReturnType<T>> | null;

  constructor(parameterSchemas: MappedParameters<Parameters<T>> | null, returnValueSchema: SchemaTestable<ReturnType<T>> | null, options?: FunctionSchemaOptions<T>) {
    super('function', isFunction, options);

    this.parameterSchemas = parameterSchemas;
    this.parameterNames = options?.parameterNames ?? [];
    this.returnValueSchema = returnValueSchema;
  }
}

export function func<T extends (...args: any[]) => any>(parameterSchemas: MappedParameters<Parameters<T>> | null, returnValueSchema: SchemaTestable<ReturnType<T>> | null, options?: FunctionSchemaOptions<T>): FunctionSchema<T> {
  return new FunctionSchema(parameterSchemas, returnValueSchema, options);
}

export function Method<T extends (...args: any[]) => any>(options?: FunctionSchemaOptions<T> & SchemaDecoratorOptions): CombinedSchemaDecorator;
export function Method<T extends (...args: any[]) => any>(parameterSchemas: MappedParameters<Parameters<T>> | null, returnValueSchema: SchemaTestable<ReturnType<T>> | null, options?: FunctionSchemaOptions<T> & SchemaDecoratorOptions): CombinedSchemaDecorator;
export function Method<T extends (...args: any[]) => any>(parameterSchemasOrOptions?: MappedParameters<Parameters<T>> | null | (FunctionSchemaOptions<T> & SchemaDecoratorOptions), returnValueSchema?: SchemaTestable<ReturnType<T>> | null, optionsOrNothing?: FunctionSchemaOptions<T> & SchemaDecoratorOptions): CombinedSchemaDecorator {
  if (isArray(parameterSchemasOrOptions) || isNull(parameterSchemasOrOptions)) {
    return Property({
      ...optionsOrNothing,
      schema: (data) => func(parameterSchemasOrOptions, returnValueSchema as SchemaTestable, { description: data.description, example: data.example, ...optionsOrNothing })
    });
  }

  return createMethodDecorator({
    handler: (data, _metdata, originalArguments) => {
      createSchemaDecorator(parameterSchemasOrOptions)(...originalArguments);
      Property(getFunctionSchemaFromReflection(data.constructor, data.methodKey), parameterSchemasOrOptions);
    }
  }) as CombinedSchemaDecorator;
}

export function getFunctionSchemaFromReflection(type: AbstractConstructor, method: string | symbol): Schema<Function> | FunctionSchema<(...args: any[]) => any> {
  const schema = tryGetFunctionSchemaFromReflection(type, method);

  if (isNull(schema)) {
    throw new Error(`Could not get functions schema for ${type.name}["${String(method)}"] from reflection data.`);
  }

  return schema;
}

export function tryGetFunctionSchemaFromReflection(type: AbstractConstructor, method: string | symbol): Schema<Function> | FunctionSchema<(...args: any[]) => any> | null {
  const typeMetadata = reflectionRegistry.getMetadata(type);
  const methodMetadata = typeMetadata?.methods.get(method);

  if (isUndefined(methodMetadata)) {
    return null;
  }

  const methodData = methodMetadata.data.tryGet<SchemaReflectionData>('schema') ?? {};

  if (isFunction(methodData.schema)) {
    return schemaTestableToSchema(methodData.schema(methodData)) as Schema<Function>;
  }

  const parameterSchemas = methodMetadata.parameters.map((parameterMetadata) => {
    const parameterData = parameterMetadata.data.tryGet<SchemaReflectionData>('schema') ?? {};
    return schemaReflectionDataToSchema(parameterData, parameterMetadata.type, { type, key: `${String(method)}(parameter:${parameterMetadata.index})` });
  });

  const parameterNames = methodMetadata.parameters.map((parameterMetadata) => {
    const parameterData = parameterMetadata.data.tryGet<SchemaReflectionData>('schema') ?? {};
    return parameterData.parameter?.name ?? null;
  });

  const returnTypeSchema = isDefined(methodData.method?.returnType) ? methodData.method.returnType(methodData) : (methodMetadata.returnType ?? optional(never()));

  return func(parameterSchemas, returnTypeSchema, { parameterNames, description: methodData.description, example: methodData.example });
}
