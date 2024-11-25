import type { Entity } from '#/database/index.js';
import type { estypes } from '@elastic/elasticsearch';

export type SortOrder = estypes.SortOrder;

export type Sort<T extends Entity = Entity> = SortCombinations<T> | SortCombinations<T>[];
export type SortCombinations<T extends Entity = Entity> = keyof T | SortOptions<T>;
export type SortOptions<T extends Entity = Entity> = estypes.SortOptionsKeys & { [P in keyof T]?: estypes.SortOptions[string]; };
