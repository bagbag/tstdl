import type { Entity } from '#/database/index.js';
import type { SortOptions as ElasticSortOptions, SortOptionsKeys } from '@elastic/elasticsearch/lib/api/types.js';

export type { SortOrder } from '@elastic/elasticsearch/lib/api/types.js';

export type Sort<T extends Entity = Entity> = SortCombinations<T> | SortCombinations<T>[];
export type SortCombinations<T extends Entity = Entity> = keyof T | SortOptions<T>;
export type SortOptions<T extends Entity = Entity> = SortOptionsKeys & { [P in keyof T]?: ElasticSortOptions[string]; };
