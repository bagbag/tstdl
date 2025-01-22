import type { FunctionDeclaration, FunctionDeclarationSchema } from '@google/generative-ai';

import { convertToOpenApiSchema } from '#/schema/converters/openapi-converter.js';
import { FunctionSchema, getObjectSchema, object } from '#/schema/index.js';
import type { AbstractConstructor } from '#/types.js';
import { fromEntries, objectEntries } from '#/utils/object/object.js';
import { isNotNull, isNull, isString } from '#/utils/type-guards.js';

export function getFunctionDeclarations(type: AbstractConstructor): FunctionDeclaration[] {
  const objectSchema = getObjectSchema(type);

  return objectEntries(objectSchema.properties)
    .map(([key, schema]) => {
      if (!(schema instanceof FunctionSchema)) {
        return null;
      }

      return {
        name: `${type.name}.${key as string}`,
        description: schema.description ?? undefined,
        parameters: isNull(schema.parameterSchemas)
          ? undefined
          : getFunctionDeclarationParameters(schema)

      } satisfies FunctionDeclaration;
    })
    .filter(isNotNull);
}

function getFunctionDeclarationParameters(functionSchema: FunctionSchema<any>): FunctionDeclarationSchema {
  const entries = functionSchema.parameterSchemas!.map((schema, index) => {
    const parameterName = functionSchema.parameterNames[index];

    if (!isString(parameterName)) {
      throw new Error(`Parameter ${index} requires a name.`);
    }

    return [parameterName, schema] as const;
  });

  const parametersSchema = object(fromEntries(entries));
  return convertToOpenApiSchema(parametersSchema) as any as FunctionDeclarationSchema;
}
