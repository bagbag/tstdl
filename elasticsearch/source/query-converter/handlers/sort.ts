import type { StringMap } from '@tstdl/base/types';
import { isUndefined } from '@tstdl/base/utils';
import type { Aggregation, Sort } from '@tstdl/search-index/query';

type ElasticsearchSortOrder = 'asc' | 'desc';

type ElasticsearchSortMode = 'min' | 'max' | 'sum' | 'avg' | 'median';

type ElasticsearchSort = string | StringMap<{ order?: ElasticsearchSortOrder, mode?: ElasticsearchSortMode }> | StringMap<ElasticsearchSortOrder>;

export class SortConverter {
  convert(sort: Sort): object {
    if (sort.aggregation == 'length') {
      return lengthSort(sort);
    }

    const sortObj: ElasticsearchSort = {};

    if (isUndefined(sort.aggregation)) {
      const order = (sort.order == 'ascending') ? 'asc' : 'desc';
      sortObj[sort.field] = order;
    }
    else {
      const order = (sort.order == 'ascending') ? 'asc' : 'desc';
      const mode = aggregationToMode(sort.aggregation);

      sortObj[sort.field] = { order, mode };
    }

    return sortObj;
  }
}

function aggregationToMode(aggregation: Aggregation): ElasticsearchSortMode {
  switch (aggregation) {
    case 'min':
    case 'max':
    case 'sum':
    case 'median':
      return aggregation;

    case 'average':
      return 'avg';

    case 'length':
      throw new Error('call lengthSort for sorting by length');

    default:
      throw new Error(`${aggregation as string} not implemented`);
  }
}

function lengthSort(sort: Sort): object {
  const scriptObj = {
    _script: {
      type: 'number',
      script: {
        lang: 'expression',
        inline: `doc['${sort.field}'].length`
      },
      order: (sort.order == 'ascending') ? 'asc' : 'desc'
    }
  };

  return scriptObj;
}
