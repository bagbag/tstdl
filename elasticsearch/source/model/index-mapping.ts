/* eslint-disable @typescript-eslint/naming-convention */

import type { StringMap, TypedOmit } from '@tstdl/base/types';
import type { Entity } from '@tstdl/database';

export type ElasticsearchIndexMapping<T extends Entity = Entity> = {
  properties: { [P in keyof TypedOmit<T, 'id'>]: ElasticsearchIndexMappingItem<T[P]> }
};

export type ElasticsearchIndexMappingItemBase<Type extends string = string> = {
  type: Type,
  meta?: any
};

export type ElasticsearchKeywordIndexMappingItem = ElasticsearchIndexMappingItemBase<'keyword'> & {
  index?: boolean,
  ignore_above?: number
};

export type ElasticsearchTextIndexMappingItem = ElasticsearchIndexMappingItemBase<'text'> & {
  index?: boolean,
  analyzer?: string,
  search_analyzer?: string,
  fields?: StringMap<ElasticsearchIndexMappingItem>
};

export type ElasticsearchNumberIndexMappingItem = ElasticsearchIndexMappingItemBase<'long' | 'integer' | 'short' | 'byte' | 'double' | 'float' | 'half_float' | 'unsigned_long'> & {
  index?: boolean,
  coerce?: boolean,
  boost?: number,
  doc_values?: boolean,
  null_value?: number | null,
  on_script_error?: 'fail' | 'continue',
  script?: string,
  store?: boolean
};

export type ElasticsearchDateIndexMappingItem = ElasticsearchIndexMappingItemBase<'date'> & {
  index?: boolean,
  boost?: number,
  doc_values?: boolean,
  format?: string,
  locale?: string,
  store?: boolean
};

export type ElasticsearchObjectIndexMappingItem<T> = ElasticsearchIndexMappingItemBase<'object'> & {
  index?: boolean,
  dynamic?: boolean | 'strict',
  enabled?: boolean,
  properties: { [P in keyof T]: ElasticsearchIndexMappingItem }
};

export type ElasticsearchIndexMappingItem<T = any> = ElasticsearchKeywordIndexMappingItem | ElasticsearchTextIndexMappingItem | ElasticsearchNumberIndexMappingItem | ElasticsearchDateIndexMappingItem | ElasticsearchObjectIndexMappingItem<T>;
