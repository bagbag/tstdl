/* eslint-disable @typescript-eslint/naming-convention */

import type { Entity } from '#/database';
import type { DeepFlatten, StringMap, TypedOmit } from '#/types';
import type { ElasticGeoPoint } from './geo-point';

export type ElasticIndexMapping<T extends Entity = Entity> = ElasticNestedIndexMapping<TypedOmit<T, 'id'>>;

export type ElasticNestedIndexMapping<T> = {
  properties: { [P in keyof Required<T>]: ElasticIndexMappingItem<DeepFlatten<Required<T>[P]>> }
};

export type OnScriptError = 'fail' | 'continue';

export type ElasticIndexMappingItemBase<Type extends string = string> = {
  type: Type,
  meta?: any
};

export type ElasticKeywordIndexMappingItem = ElasticIndexMappingItemBase<'keyword'> & {
  index?: boolean,
  ignore_above?: number
};

export type ElasticTextIndexMappingItem = ElasticIndexMappingItemBase<'text'> & {
  index?: boolean,
  analyzer?: string,
  search_analyzer?: string,
  fields?: StringMap<ElasticIndexMappingItem>
};

export type ElasticNumberIndexMappingItem = ElasticIndexMappingItemBase<'long' | 'integer' | 'short' | 'byte' | 'double' | 'float' | 'half_float' | 'unsigned_long'> & {
  index?: boolean,
  coerce?: boolean,
  boost?: number,
  doc_values?: boolean,
  null_value?: number | null,
  on_script_error?: OnScriptError,
  script?: string,
  store?: boolean
};

export type ElasticBooleanIndexMappingItem = ElasticIndexMappingItemBase<'boolean'> & {
  index?: boolean,
  boost?: number,
  doc_values?: boolean,
  null_value?: boolean | null,
  on_script_error?: OnScriptError,
  script?: string,
  store?: boolean
};

export type ElasticDateIndexMappingItem = ElasticIndexMappingItemBase<'date'> & {
  index?: boolean,
  boost?: number,
  doc_values?: boolean,
  format?: string,
  locale?: string,
  store?: boolean
};

export type ElasticGeoPointIndexMappingItem = ElasticIndexMappingItemBase<'geo_point'> & {
  index?: boolean,
  ignore_malformed?: boolean,
  ignore_z_value?: boolean,
  null_value?: ElasticGeoPoint | null,
  on_script_error?: OnScriptError,
  script?: string
};

export type ElasticObjectIndexMappingItem<T> = ElasticIndexMappingItemBase<'object'> & {
  index?: boolean,
  dynamic?: boolean | 'strict',
  enabled?: boolean
} & ElasticNestedIndexMapping<T>;

export type ElasticNestedIndexMappingItem<T> = ElasticIndexMappingItemBase<'nested'> & {
  index?: boolean,
  dynamic?: boolean | 'strict',
  include_in_parent?: boolean,
  include_in_root?: boolean
} & ElasticNestedIndexMapping<T>;

export type ElasticIndexMappingItem<T = any> =
  | ElasticKeywordIndexMappingItem
  | ElasticTextIndexMappingItem
  | ElasticNumberIndexMappingItem
  | ElasticBooleanIndexMappingItem
  | ElasticDateIndexMappingItem
  | ElasticGeoPointIndexMappingItem
  | ElasticObjectIndexMappingItem<T>
  | ElasticNestedIndexMappingItem<T>;
