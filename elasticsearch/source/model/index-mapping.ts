/* eslint-disable @typescript-eslint/naming-convention */

import type { StringMap, TypedOmit } from '@tstdl/base/types';
import type { Entity } from '@tstdl/database';

export type ElasticIndexMapping<T extends Entity = Entity> = {
  properties: { [P in keyof TypedOmit<T, 'id'>]: ElasticIndexMappingItem<T[P]> }
};

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
  on_script_error?: 'fail' | 'continue',
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

export type ElasticObjectIndexMappingItem<T> = ElasticIndexMappingItemBase<'object'> & {
  index?: boolean,
  dynamic?: boolean | 'strict',
  enabled?: boolean,
  properties: { [P in keyof T]: ElasticIndexMappingItem }
};

export type ElasticIndexMappingItem<T = any> = ElasticKeywordIndexMappingItem | ElasticTextIndexMappingItem | ElasticNumberIndexMappingItem | ElasticDateIndexMappingItem | ElasticObjectIndexMappingItem<T>;
