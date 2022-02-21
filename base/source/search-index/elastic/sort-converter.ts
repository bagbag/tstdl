import type { Entity, Sort } from '#/database';
import type { SortCombinations, SortOrder } from './model';

const renameMap = new Map([
  ['id', '_id'],
  ['$score', '_score']
]);

// eslint-disable-next-line max-lines-per-function, max-statements, complexity
export function convertSort<T extends Entity>(sort: Sort<T>, keywordRewrites: Set<string>): SortCombinations {
  const name = renameMap.get(sort.field as string) ?? sort.field as string;
  const rewrite = keywordRewrites.has(name);
  const field = rewrite ? `${name}.keyword` : name;
  const order: SortOrder = sort.order ?? 'asc';

  return `${field}:${order}`;
}
