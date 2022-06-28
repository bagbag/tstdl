import type { Entity, Sort } from '#/database';
import type { KeywordRewriter } from './keyword-rewriter';
import type { SortCombinations, SortOrder } from './model';

const renameMap = new Map([
  ['id', '_id'],
  ['$score', '_score']
]);

// eslint-disable-next-line max-lines-per-function, max-statements, complexity
export function convertSort<T extends Entity>(sort: Sort<T>, keywordRewriter: KeywordRewriter): SortCombinations<T> {
  const name = renameMap.get(sort.field as string) ?? sort.field;
  const field = keywordRewriter.rewriteIfRequired(name);
  const order: SortOrder = sort.order ?? 'asc';

  if (((field != '_score') && (order == 'asc')) || ((field == '_score') && (order == 'desc'))) {
    return field as keyof T;
  }

  return { [field]: order } as SortCombinations<T>;
}
