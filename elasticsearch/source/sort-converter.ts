import type { SortCombinations, SortOrder as ElasticSortOrder } from '@elastic/elasticsearch/api/types';
import type { Sort } from '@tstdl/database';

// eslint-disable-next-line max-lines-per-function, max-statements, complexity
export function convertSort(sort: Sort): SortCombinations {
  const field = sort.field == 'id' ? '_id' : sort.field as string;
  const order: ElasticSortOrder = sort.order == 'descending' ? 'desc' : 'asc';
  return `${field}:${order}`;
}
