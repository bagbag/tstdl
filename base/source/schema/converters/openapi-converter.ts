import { NotSupportedError } from '#/errors/not-supported.error.js';
import type { Json, UndefinableJsonObject } from '#/types.js';
import { fromEntries, hasOwnProperty, objectEntries } from '#/utils/object/object.js';
import { isDefined, isNotNull, isNumber, isString } from '#/utils/type-guards.js';
import type { Schema, SchemaTestable } from '../schema.js';
import { ArraySchema } from '../schemas/array.js';
import { BooleanSchema } from '../schemas/boolean.js';
import { DateSchema } from '../schemas/date.js';
import { EnumerationSchema } from '../schemas/enumeration.js';
import { LiteralSchema } from '../schemas/literal.js';
import { nullable, NullableSchema } from '../schemas/nullable.js';
import { NumberSchema } from '../schemas/number.js';
import { ObjectSchema } from '../schemas/object.js';
import { OptionalSchema } from '../schemas/optional.js';
import { StringSchema } from '../schemas/string.js';
import { UnionSchema } from '../schemas/union.js';
import { schemaTestableToSchema } from '../testable.js';

export function convertToOpenApiSchema(testable: SchemaTestable): UndefinableJsonObject {
  const schema = schemaTestableToSchema(testable);

  const openApiSchema = convertToOpenApiSchemaBase(schema);

  return {
    ...openApiSchema,
    ...(hasOwnProperty(openApiSchema, 'nullable') ? undefined : { nullable: false }),
    ...(isNotNull(schema.description) ? { description: schema.description } : undefined),
    ...(isDefined(schema.example) ? { example: schema.example as Json } : undefined),
  };
}

function convertToOpenApiSchemaBase(schema: Schema): UndefinableJsonObject {
  if (schema instanceof ObjectSchema) {
    const entries = objectEntries(schema.properties);
    const convertedEntries = entries.map(([property, propertySchema]) => [property, convertToOpenApiSchema(stripOptional(propertySchema))]);

    return {
      type: 'object',
      properties: fromEntries(convertedEntries),
      required: entries
        .filter(([, propertySchema]) => !(propertySchema instanceof OptionalSchema) && !((propertySchema instanceof NullableSchema) && (propertySchema.schema instanceof OptionalSchema)))
        .map(([property]) => property as string),
    };
  }

  if (schema instanceof StringSchema) {
    return {
      type: 'string',
    };
  }

  if (schema instanceof DateSchema) {
    return {
      type: 'string',
      format: 'date-time',
    };
  }

  if (schema instanceof NumberSchema) {
    return {
      type: schema.integer ? 'integer' : 'number',
      ...(isNumber(schema.minimum) ? { minimum: schema.minimum } : undefined),
      ...(isNumber(schema.maximum) ? { maximum: schema.maximum } : undefined),
    };
  }

  if (schema instanceof BooleanSchema) {
    return {
      type: 'boolean',
    };
  }

  if (schema instanceof LiteralSchema) {
    return {
      type: typeof schema.value,
      enum: [schema.value],
    };
  }

  if (schema instanceof ArraySchema) {
    return {
      type: 'array',
      items: convertToOpenApiSchema(schema.itemSchema),
      ...(isNumber(schema.minimum) ? { minItems: schema.minimum } : undefined),
      ...(isNumber(schema.maximum) ? { maxItems: schema.maximum } : undefined),
    };
  }

  if (schema instanceof EnumerationSchema) {
    const hasString = schema.allowedValues.some(isString);
    const hasNumber = schema.allowedValues.some(isNumber);

    if (schema.allowedValues.length === 0) {
      throw new NotSupportedError('Enum must have at least one value.');
    }

    if (!hasString && !hasNumber) {
      throw new NotSupportedError('Enum must be either string or number but not both.');
    }

    return {
      type: hasString ? 'string' : 'number',
      format: 'enum',
      enum: schema.allowedValues,
    };
  }

  if (schema instanceof NullableSchema) {
    if (schema.schema instanceof EnumerationSchema) {
      const enumSchema = convertToOpenApiSchema(schema.schema);

      return {
        ...enumSchema,
        nullable: true,
      };
    }

    return {
      ...convertToOpenApiSchema(schema.schema),
      nullable: true,
    };
  }

  if (schema instanceof UnionSchema) {
    return {
      oneOf: schema.schemas.map((innerSchema) => convertToOpenApiSchema(innerSchema as SchemaTestable)),
    };
  }

  throw new NotSupportedError(`Schema "${schema.name}" not supported.`);
}

function stripOptional(schema: Schema): Schema {
  if ((schema instanceof OptionalSchema)) {
    return schema.schema;
  }

  if ((schema instanceof NullableSchema) && (schema.schema instanceof OptionalSchema)) {
    return nullable(schema.schema.schema);
  }

  return schema;
}
