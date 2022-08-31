/* eslint-disable @typescript-eslint/naming-convention */

import type { Entity } from '#/database';
import type { DeepFlatten, StringMap, TypedOmit } from '#/types';
import { mergeObjects } from '#/utils/object/merge';
import type { MappingBooleanProperty, MappingByteNumberProperty, MappingDateProperty, MappingDoubleNumberProperty, MappingFloatNumberProperty, MappingGeoPointProperty, MappingHalfFloatNumberProperty, MappingIntegerNumberProperty, MappingKeywordProperty, MappingLongNumberProperty, MappingNestedProperty, MappingObjectProperty, MappingPropertyBase, MappingScaledFloatNumberProperty, MappingShortNumberProperty, MappingTextProperty, MappingTypeMapping, MappingUnsignedLongNumberProperty } from '@elastic/elasticsearch/lib/api/types';

export type ElasticIndexMapping<T extends Entity = Entity> = TypedOmit<MappingTypeMapping, 'properties'> & ElasticNestedIndexMapping<TypedOmit<T, 'id'>>;

export type ElasticNestedIndexMapping<T> = {
  properties: { [P in keyof Required<T>]: ElasticIndexMappingItem<DeepFlatten<Required<T>[P]>> }
};

type StrippedBaseType<T extends MappingPropertyBase> = TypedOmit<T, 'properties' | 'fields'>;

type ElasticIndexMappingItemBase = {
  index?: boolean,
  fields?: StringMap<ElasticIndexMappingItem>
};

export type MappingNumberProperty =
  | MappingByteNumberProperty
  | MappingDoubleNumberProperty
  | MappingFloatNumberProperty
  | MappingHalfFloatNumberProperty
  | MappingIntegerNumberProperty
  | MappingLongNumberProperty
  | MappingShortNumberProperty
  | MappingScaledFloatNumberProperty
  | MappingUnsignedLongNumberProperty;

export type ElasticKeywordIndexMappingItem = ElasticIndexMappingItemBase & StrippedBaseType<MappingKeywordProperty>;

export type ElasticTextIndexMappingItem = ElasticIndexMappingItemBase & StrippedBaseType<MappingTextProperty>;

export type ElasticNumberIndexMappingItem = ElasticIndexMappingItemBase & StrippedBaseType<MappingNumberProperty>;

export type ElasticBooleanIndexMappingItem = ElasticIndexMappingItemBase & StrippedBaseType<MappingBooleanProperty>;

export type ElasticDateIndexMappingItem = ElasticIndexMappingItemBase & StrippedBaseType<MappingDateProperty>;

export type ElasticGeoPointIndexMappingItem = ElasticIndexMappingItemBase & StrippedBaseType<MappingGeoPointProperty>;

export type ElasticObjectIndexMappingItem<T> = ElasticIndexMappingItemBase & StrippedBaseType<MappingObjectProperty> & ElasticNestedIndexMapping<T>;

export type ElasticNestedIndexMappingItem<T> = ElasticIndexMappingItemBase & StrippedBaseType<MappingNestedProperty> & ElasticNestedIndexMapping<T>;

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
