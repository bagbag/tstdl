/* eslint-disable @typescript-eslint/naming-convention */

import type { Entity } from '#/database/index.js';
import type { DeepFlatten, StringMap, TypedOmit } from '#/types.js';
import { mergeObjects } from '#/utils/object/merge.js';
import type { estypes } from '@elastic/elasticsearch';

export type ElasticIndexMapping<T extends Entity = Entity> = TypedOmit<estypes.MappingTypeMapping, 'properties'> & ElasticNestedIndexMapping<TypedOmit<T, 'id'>>;

export type ElasticNestedIndexMapping<T> = {
  properties: { [P in keyof Required<T>]: ElasticIndexMappingItem<DeepFlatten<Required<T>[P]>> }
};

type StrippedBaseType<T extends estypes.MappingPropertyBase> = TypedOmit<T, 'properties' | 'fields'>;

type ElasticIndexMappingItemBase = {
  index?: boolean,
  fields?: StringMap<ElasticIndexMappingItem>
};

export type MappingNumberProperty =
  | estypes.MappingByteNumberProperty
  | estypes.MappingDoubleNumberProperty
  | estypes.MappingFloatNumberProperty
  | estypes.MappingHalfFloatNumberProperty
  | estypes.MappingIntegerNumberProperty
  | estypes.MappingLongNumberProperty
  | estypes.MappingShortNumberProperty
  | estypes.MappingScaledFloatNumberProperty
  | estypes.MappingUnsignedLongNumberProperty;

export type ElasticKeywordIndexMappingItem = ElasticIndexMappingItemBase & StrippedBaseType<estypes.MappingKeywordProperty>;

export type ElasticTextIndexMappingItem = ElasticIndexMappingItemBase & StrippedBaseType<estypes.MappingTextProperty>;

export type ElasticNumberIndexMappingItem = ElasticIndexMappingItemBase & StrippedBaseType<MappingNumberProperty>;

export type ElasticBooleanIndexMappingItem = ElasticIndexMappingItemBase & StrippedBaseType<estypes.MappingBooleanProperty>;

export type ElasticDateIndexMappingItem = ElasticIndexMappingItemBase & StrippedBaseType<estypes.MappingDateProperty>;

export type ElasticGeoPointIndexMappingItem = ElasticIndexMappingItemBase & StrippedBaseType<estypes.MappingGeoPointProperty>;

export type ElasticObjectIndexMappingItem<T> = ElasticIndexMappingItemBase & StrippedBaseType<estypes.MappingObjectProperty> & ElasticNestedIndexMapping<T>;

export type ElasticNestedIndexMappingItem<T> = ElasticIndexMappingItemBase & StrippedBaseType<estypes.MappingNestedProperty> & ElasticNestedIndexMapping<T>;

export type ElasticIndexMappingItem<T = any> =
  | ElasticKeywordIndexMappingItem
  | ElasticTextIndexMappingItem
  | ElasticNumberIndexMappingItem
  | ElasticBooleanIndexMappingItem
  | ElasticDateIndexMappingItem
  | ElasticGeoPointIndexMappingItem
  | ElasticObjectIndexMappingItem<T>
  | ElasticNestedIndexMappingItem<T>;

export function mergeElasticSearchMappings<T extends Entity>(mappings: ElasticIndexMapping<T>[]): ElasticIndexMapping<T> {
  return mergeObjects(mappings);
}
