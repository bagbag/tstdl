/* eslint-disable max-depth */

import type { EmptyObject, Merge } from 'type-fest';

import type { JsonPath } from '#/json-path/json-path.js';
import { reflectionRegistry, type TypeMetadata } from '#/reflection/index.js';
import { SchemaError } from '#/schema/schema.error.js';
import type { AbstractConstructor, OneOrMany, PartialProperty, Record as RecordType, SimplifyObject, Type, TypedOmit } from '#/types.js';
import { toArray } from '#/utils/array/array.js';
import { memoizeSingle } from '#/utils/function/memoize.js';
import { filterObject, mapObjectValues, objectKeys } from '#/utils/object/object.js';
import { assert, isDefined, isFunction, isLiteralObject, isNotNull, isNotNullOrUndefined, isNull, isObject, isUndefined } from '#/utils/type-guards.js';
import { typeOf } from '#/utils/type-of.js';
import { Property, type SchemaPropertyDecoratorOptions } from '../decorators/index.js';
import type { SchemaPropertyDecorator, SchemaPropertyReflectionData, SchemaTypeReflectionData } from '../decorators/types.js';
import { type OPTIONAL, Schema, type SchemaOutput, type SchemaTestable, type SchemaTestOptions, type SchemaTestResult } from '../schema.js';
import { schemaTestableToSchema } from '../testable.js';
import { array } from './array.js';
import { nullable } from './nullable.js';
import { optional } from './optional.js';

export type Record<K extends PropertyKey = PropertyKey, V = any> = RecordType<K, V>;

export type ObjectSchemaFactoryFunction<T> = (data: T) => T;
export type ObjectSchemaFactory<T> = { type: Type<T> } | ObjectSchemaFactoryFunction<T>;
export type ObjectSchemaProperties<T extends Record = Record> = { [P in keyof T]-?: SchemaTestable<T[P]> };
export type NormalizedObjectSchemaProperties<T extends Record> = { [P in keyof T]-?: Schema<T[P]> };

export type ObjectSchemaOptions<T extends Record = Record, K extends PropertyKey = PropertyKey, V = unknown> = {
  mask?: boolean | null,
  unknownProperties?: SchemaTestable<V> | null,
  unknownPropertiesKey?: SchemaTestable<K> | null,
  factory?: ObjectSchemaFactory<T> | null
};

export type ObjectSchemaOrType<T extends Record = any> = ObjectSchema<T> | AbstractConstructor<T>;

export type OptionalProperties<T> = { [P in keyof T]: T[P] extends { [OPTIONAL]: true } ? P : never }[keyof T];

export type ObjectSchemaPropertiesType<TP extends ObjectSchemaProperties> = SimplifyObject<{ [P in keyof PartialProperty<TP, OptionalProperties<TP>>]: SchemaOutput<TP[P]> }>;

export const tryGetSchemaFromReflection = memoizeSingle(_tryGetSchemaFromReflection, { weak: true });

export class ObjectSchema<T extends Record = Record> extends Schema<T> {
  private readonly propertyKeys: Set<keyof T>;
  private readonly allowUnknownProperties: boolean;

  readonly properties: NormalizedObjectSchemaProperties<T>;
  readonly mask: boolean | null;
  readonly unknownProperties: Schema | null;
  readonly unknownPropertiesKey: Schema<PropertyKey> | null;
  readonly factory: ObjectSchemaFactory<T> | null;

  constructor(properties: ObjectSchemaProperties<T>, options: ObjectSchemaOptions<T> = {}) {
    super();

    this.properties = mapObjectValues(properties, (value) => schemaTestableToSchema(value)) as NormalizedObjectSchemaProperties<T>;
    this.mask = options.mask ?? null;
    this.unknownProperties = isNotNullOrUndefined(options.unknownProperties) ? schemaTestableToSchema(options.unknownProperties) : null;
    this.unknownPropertiesKey = isNotNullOrUndefined(options.unknownPropertiesKey) ? schemaTestableToSchema(options.unknownPropertiesKey) : null;
    this.factory = options.factory ?? null;

    this.allowUnknownProperties = isNotNull(this.unknownProperties) || isNotNull(this.unknownPropertiesKey);
    this.propertyKeys = new Set(objectKeys(properties));
  }

  override _test(value: any, path: JsonPath, options: SchemaTestOptions): SchemaTestResult<T> {
    if (!isObject(value)) {
      return { valid: false, error: SchemaError.expectedButGot('object', typeOf(value), path) };
    }

    const mask = this.mask ?? options.mask ?? false;
    const resultValue: Partial<T> = isLiteralObject(this.factory) ? new (this.factory as Exclude<ObjectSchemaFactory<T>, ObjectSchemaFactoryFunction<T>>).type() : {};

    const valueKeys = new Set(objectKeys(value));
    const unknownValuePropertyKeys: Set<PropertyKey> = valueKeys.difference(this.propertyKeys);

    if ((unknownValuePropertyKeys.size > 0) && !mask && !this.allowUnknownProperties) {
      return { valid: false, error: new SchemaError('Unexpected property', { path: path.add(unknownValuePropertyKeys.values().next().value), fast: options.fastErrors }) };
    }

    for (const key of this.propertyKeys) {
      const propertyResult = this.properties[key]._test((value as Record)[key], path.add(key), options);

      if (!propertyResult.valid) {
        return propertyResult;
      }

      resultValue[key] = propertyResult.value;
    }

    if (this.allowUnknownProperties) {
      for (const key of unknownValuePropertyKeys) {
        const propertyPath = path.add(key);

        const keyResult = this.unknownPropertiesKey?._test(key, propertyPath, options) ?? { valid: true };

        if (!keyResult.valid) {
          if (mask) {
            continue;
          }

          return { valid: false, error: new SchemaError('Invalid property key.', { path: propertyPath, inner: keyResult.error, fast: options.fastErrors }) };
        }


        const innerValueResult = this.unknownProperties?._test((value as Record)[key], propertyPath, options) ?? { valid: true, value: (value as Record)[key] };

        if (!innerValueResult.valid) {
          return innerValueResult;
        }

        resultValue[key as keyof T] = innerValueResult.value;
      }
    }

    const testResultValue = isFunction(this.factory) ? this.factory(resultValue as T) : resultValue;

    return { valid: true, value: testResultValue as T };
  }
}

export function object<const K extends PropertyKey, const V>(properties: Record<never>, options: ObjectSchemaOptions<Record<K, V>> & { unknownProperties: SchemaTestable<V>, unknownPropertiesKey: SchemaTestable<K> }): ObjectSchema<Record<K, V>>;
export function object<const K extends PropertyKey>(properties: Record<never>, options: ObjectSchemaOptions<Record<K, unknown>> & { unknownProperties?: undefined, unknownPropertiesKey: SchemaTestable<K> }): ObjectSchema<Record<K, unknown>>;
export function object<const V>(properties: Record<never>, options: ObjectSchemaOptions<Record<PropertyKey, V>> & { unknownProperties: SchemaTestable<V>, unknownPropertiesKey?: undefined }): ObjectSchema<Record<PropertyKey, V>>;
export function object<const TP extends ObjectSchemaProperties, const K extends PropertyKey, const V>(properties: TP, options: ObjectSchemaOptions<ObjectSchemaPropertiesType<TP> & Record<K, V>> & { unknownProperties: SchemaTestable<V>, unknownPropertiesKey: SchemaTestable<K> }): ObjectSchema<ObjectSchemaPropertiesType<TP> & Record<K, V>>;
export function object<const TP extends ObjectSchemaProperties, const K extends PropertyKey>(properties: TP, options: ObjectSchemaOptions<ObjectSchemaPropertiesType<TP> & Record<K, unknown>> & { unknownPropertiesKey: SchemaTestable<K> }): ObjectSchema<ObjectSchemaPropertiesType<TP> & Record<K, unknown>>;
export function object<const TP extends ObjectSchemaProperties, const V>(properties: TP, options: ObjectSchemaOptions<ObjectSchemaPropertiesType<TP> & Record<PropertyKey, V>> & { unknownProperties: SchemaTestable<V> }): ObjectSchema<ObjectSchemaPropertiesType<TP> & Record<PropertyKey, V>>;
export function object<const TP extends ObjectSchemaProperties>(properties: TP, options?: ObjectSchemaOptions<ObjectSchemaPropertiesType<TP>> & { unknownProperties?: undefined, unknownPropertiesKey?: undefined }): ObjectSchema<ObjectSchemaPropertiesType<TP>>;
export function object<const TP extends ObjectSchemaProperties, const K extends PropertyKey, const V>(properties: TP, options?: ObjectSchemaOptions<ObjectSchemaPropertiesType<TP>, K, V>): ObjectSchema<ObjectSchemaPropertiesType<TP> & Record<K, V>>;
export function object(properties: ObjectSchemaProperties, options?: ObjectSchemaOptions): ObjectSchema {
  return new ObjectSchema(properties, options);
}

export function explicitObject<const T extends Record>(properties: ObjectSchemaProperties<T>, options?: ObjectSchemaOptions<T>): ObjectSchema<T> {
  return object(properties as ObjectSchemaProperties, options) as any as ObjectSchema<T>;
}

export function record<const K extends PropertyKey, const V>(key: Schema<K>, value: Schema<V>, options?: TypedOmit<ObjectSchemaOptions<Record<K, V>>, 'unknownProperties' | 'unknownPropertiesKey'>): ObjectSchema<Record<K, V>> {
  return object({}, { ...options, unknownPropertiesKey: key, unknownProperties: value });
}

export function assign<const T1 extends Record, const T2 extends Record>(a: ObjectSchemaOrType<T1>, b: ObjectSchemaOrType<T2>): ObjectSchema<Merge<T1, T2>>;
export function assign<const T1 extends Record, const T2 extends Record, const T3 extends Record>(a: ObjectSchemaOrType<T1>, b: ObjectSchemaOrType<T2>, c: ObjectSchemaOrType<T3>): ObjectSchema<Merge<Merge<T1, T2>, T3>>;
export function assign<const T1 extends Record, const T2 extends Record, const T3 extends Record, const T4 extends Record>(a: ObjectSchemaOrType<T1>, b: ObjectSchemaOrType<T2>, c: ObjectSchemaOrType<T3>, d: ObjectSchemaOrType<T4>): ObjectSchema<Merge<Merge<Merge<T1, T2>, T3>, T4>>;
export function assign<const T1 extends Record, const T2 extends Record, const T3 extends Record, const T4 extends Record, const T5 extends Record>(a: ObjectSchemaOrType<T1>, b: ObjectSchemaOrType<T2>, c: ObjectSchemaOrType<T3>, d: ObjectSchemaOrType<T4>, e: ObjectSchemaOrType<T5>): ObjectSchema<Merge<Merge<Merge<Merge<T1, T2>, T3>, T4>, T5>>;
export function assign<const T1 extends Record, const T2 extends Record, const T3 extends Record, const T4 extends Record, const T5 extends Record, const T6 extends Record>(a: ObjectSchemaOrType<T1>, b: ObjectSchemaOrType<T2>, c: ObjectSchemaOrType<T3>, d: ObjectSchemaOrType<T4>, e: ObjectSchemaOrType<T5>, f: ObjectSchemaOrType<T6>): ObjectSchema<Merge<Merge<Merge<Merge<Merge<T1, T2>, T3>, T4>, T5>, T6>>;
export function assign(...schemasOrTypes: ObjectSchemaOrType[]): ObjectSchema {
  const schemas = schemasOrTypes.map(getObjectSchema);

  return object(
    schemas.reduce<ObjectSchemaProperties>((result, schema) => ({ ...result, ...schema.properties }), {}),
    {
      mask: schemas.findLast((schema) => isNotNull(schema.mask))?.mask,
      unknownProperties: schemas.findLast((schema) => isNotNull(schema.unknownProperties))?.unknownProperties,
      unknownPropertiesKey: schemas.findLast((schema) => isNotNull(schema.unknownPropertiesKey))?.unknownPropertiesKey
    }
  );
}

export function partial<const T extends Record>(schema: ObjectSchemaOrType<T>): ObjectSchema<Partial<T>>;
export function partial<const T extends Record, const K extends keyof T>(schema: ObjectSchemaOrType<T>, keys: OneOrMany<K>): ObjectSchema<PartialProperty<T, K>>;
export function partial<const T extends Record, const K extends keyof T>(schemaOrType: ObjectSchemaOrType<T>, keyOrKeys?: OneOrMany<K>): ObjectSchema<Partial<T>> {
  const schema = getObjectSchema(schemaOrType);
  const keys = isUndefined(keyOrKeys) ? undefined : toArray(keyOrKeys);

  const mapper: (propertySchema: Schema, key: keyof T) => Schema = isUndefined(keys)
    ? (propertySchema) => optional(propertySchema)
    : (propertySchema, key) => keys.includes(key as K) ? optional(propertySchema) : propertySchema;

  return object(
    mapObjectValues(schema.properties, mapper),
    {
      mask: schema.mask,
      unknownProperties: schema.unknownProperties,
      unknownPropertiesKey: schema.unknownPropertiesKey
    }
  ) as any as ObjectSchema<Partial<T>>;
}

export function pick<const T extends Record, const K extends keyof T>(schemaOrType: ObjectSchemaOrType<T>, keys: OneOrMany<K>): ObjectSchema<SimplifyObject<Pick<T, K>>> {
  const schema = getObjectSchema(schemaOrType);
  const keyArray = toArray(keys);

  return object(
    filterObject(schema.properties, (_, key) => keyArray.includes(key as any as K)) as Record<PropertyKey, Schema>,
    {
      mask: schema.mask,
      unknownProperties: schema.unknownProperties,
      unknownPropertiesKey: schema.unknownPropertiesKey
    }
  ) as ObjectSchema<Pick<T, K>>;
}

export function omit<const T extends Record, const K extends keyof T>(schemaOrType: ObjectSchemaOrType<T>, keys: OneOrMany<K>): ObjectSchema<SimplifyObject<Omit<T, K>>> {
  const schema = getObjectSchema(schemaOrType);
  const keysArray = toArray(keys);

  return object(
    filterObject(schema.properties, (_, key) => !keysArray.includes(key as any as K)) as Record<PropertyKey, Schema>,
    {
      mask: schema.mask,
      unknownProperties: schema.unknownProperties,
      unknownPropertiesKey: schema.unknownPropertiesKey
    }
  ) as ObjectSchema<Omit<T, K>>;
}


export function getSchemaFromReflection<T extends Record>(type: AbstractConstructor<T>): Schema<T> {
  const schema = tryGetSchemaFromReflection(type);

  if (isNull(schema)) {
    throw new Error(`Could not get schema for ${type.name} from reflection data.`);
  }

  return schema as Schema<T>;
}

function _tryGetSchemaFromReflection<T extends Record>(type: AbstractConstructor<T>): Schema<T> | ObjectSchema<T> | null {
  const metadata = reflectionRegistry.getMetadata(type);

  if (isUndefined(metadata)) {
    return null;
  }

  const typeData = metadata.data.tryGet<SchemaTypeReflectionData>('schema') ?? {};

  if (typeData.schema instanceof Schema) {
    return typeData.schema as Schema<T>;
  }

  if (isFunction(typeData.schema)) {
    return schemaTestableToSchema(typeData.schema) as Schema<T>;
  }

  const schema = object(getObjectSchemaPropertiesFromReflection(metadata, type) as ObjectSchemaProperties, {
    factory: isDefined(typeData.factory) ? typeData.factory : { type: type as Type },
    mask: typeData.mask,
    unknownProperties: typeData.unknownProperties,
    unknownPropertiesKey: typeData.unknownPropertiesKey
  }) as ObjectSchema<T>;

  const prototype = Reflect.getPrototypeOf(type) as AbstractConstructor;

  if (isNotNull(prototype) && reflectionRegistry.hasType(prototype)) {
    const parentSchema = getSchemaFromReflection(prototype);

    assert(parentSchema instanceof ObjectSchema, 'Can not infer an ObjectSchema from reflection when parent class has an explicit non-object schema defined.');

    return assign(parentSchema, schema) as ObjectSchema<T>;
  }

  return schema;
}

function getObjectSchemaPropertiesFromReflection<T extends Record>(metadata: TypeMetadata, type: AbstractConstructor<T>): ObjectSchemaProperties<T> {
  const properties: ObjectSchemaProperties<T> = {} as ObjectSchemaProperties<T>;

  for (const [key, propertyMetadata] of metadata.properties) {
    const reflectionData = propertyMetadata.data.tryGet<SchemaPropertyReflectionData>('schema');

    if (isUndefined(reflectionData?.schema) && (propertyMetadata.type == Object)) {
      throw new Error(`Schema of property "${String(key)}" on type ${type.name} is inferred as Object. This is most likely unwanted and happens when the property is defined as partial or the type is an union. Use an explicit @Property(Object) if this is wanted.`);
    }

    let propertySchema = reflectionData?.schema ?? propertyMetadata.type;

    if (reflectionData?.array == true) {
      propertySchema = array(propertySchema);
    }

    if (reflectionData?.nullable == true) {
      propertySchema = nullable(propertySchema);
    }

    if (reflectionData?.optional == true) {
      propertySchema = optional(propertySchema);
    }

    properties[key as keyof T] = propertySchema as SchemaTestable<T[keyof T]>;
  }

  return properties;
}

export function getObjectSchema<T extends Record>(schemaOrType: SchemaTestable<T>): ObjectSchema<T> {
  if (schemaOrType instanceof ObjectSchema) {
    return schemaOrType as ObjectSchema<T>;
  }

  if (isFunction(schemaOrType)) {
    return getObjectSchema(getSchemaFromReflection(schemaOrType as AbstractConstructor<T>));
  }

  throw new Error('Could not infer ObjectSchema.');
}

export function Record<K extends PropertyKey, V>(key: Schema<K>, value: Schema<V>, options?: TypedOmit<ObjectSchemaOptions<Record<K, V>>, 'unknownProperties' | 'unknownPropertiesKey'> & SchemaPropertyDecoratorOptions): SchemaPropertyDecorator {
  return Property(record(key, value, options), options);
}

export const emptyObjectSchema = explicitObject<EmptyObject>({} as ObjectSchemaProperties<EmptyObject>);
