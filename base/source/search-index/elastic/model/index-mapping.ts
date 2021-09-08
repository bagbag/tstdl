/* eslint-disable @typescript-eslint/naming-convention */

import type { Entity } from '#/database';
import type { DeepFlatten, StringMap, TypedOmit } from '#/types';
import type { ElasticGeoPoint } from './geo-point';

export type ElasticIndexMapping<T extends Entity = Entity> = ElasticNestedIndexMapping<TypedOmit<T, 'id'>> & {
  _source?: {
    enabled?: false,
    includes?: string[],
    excludes?: string[]
  }
};

export type ElasticNestedIndexMapping<T> = {
  properties: { [P in keyof Required<T>]: ElasticIndexMappingItem<DeepFlatten<Required<T>[P]>> }
};

export type OnScriptError = 'fail' | 'continue';

export type ElasticIndexMappingItemBase<Type extends string = string> = {
  type: Type,
  index?: boolean,
  meta?: any
};

type SharedBasics<T> = {
  boost?: number,
  store?: boolean,
  null_value?: T | null,
  script?: string,
  on_script_error?: OnScriptError
};

type KeywordTextShared = SharedBasics<string> & {
  eager_global_ordinals?: boolean,
  ignore_above?: number,
  index_options?: 'docs' | 'freqs' | 'positions' | 'offsets',
  normalizer?: string | null,
  norms?: boolean,
  similarity?: string,
  split_queries_on_whitespace?: boolean,
  fields?: StringMap<ElasticIndexMappingItem>
};

export type ElasticKeywordIndexMappingItem = ElasticIndexMappingItemBase<'keyword'> & KeywordTextShared & {
  doc_values?: boolean
};

export type ElasticTextIndexMappingItem = ElasticIndexMappingItemBase<'text'> & KeywordTextShared & {
  analyzer?: string,
  fielddata_frequency_filter?: { min: number, max: number, min_segment_size: number },
  fielddata?: boolean,
  search_analyzer?: string
};

export type ElasticNumberIndexMappingItem = ElasticIndexMappingItemBase<'long' | 'integer' | 'short' | 'byte' | 'double' | 'float' | 'half_float' | 'unsigned_long'> & SharedBasics<number> & {
  coerce?: boolean,
  doc_values?: boolean
};

export type ElasticBooleanIndexMappingItem = ElasticIndexMappingItemBase<'boolean'> & SharedBasics<boolean> & {
  doc_values?: boolean
};

export type ElasticDateIndexMappingItem = ElasticIndexMappingItemBase<'date'> & SharedBasics<Date | number | string> & {
  doc_values?: boolean,
  format?: string,
  locale?: string
};

export type ElasticGeoPointIndexMappingItem = ElasticIndexMappingItemBase<'geo_point'> & {
  ignore_malformed?: boolean,
  ignore_z_value?: boolean,
  null_value?: ElasticGeoPoint | null,
  on_script_error?: OnScriptError,
  script?: string
};

export type ElasticObjectIndexMappingItem<T> = ElasticIndexMappingItemBase<'object'> & {
  dynamic?: boolean | 'strict',
  enabled?: boolean
} & ElasticNestedIndexMapping<T>;

export type ElasticNestedIndexMappingItem<T> = ElasticIndexMappingItemBase<'nested'> & {
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
