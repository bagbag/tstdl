import type { RangeQuery } from '@tstdl/search-index/query';
import type { QueryConvertHandler, QueryConvertResult } from '../convert-handler';

type ElasticsearchRangeQueryValue = number | string;

type ElasticsearchRangeQuery = {
  range: Record<string, {
    lt?: ElasticsearchRangeQueryValue,
    gt?: ElasticsearchRangeQueryValue,
    lte?: ElasticsearchRangeQueryValue,
    gte?: ElasticsearchRangeQueryValue,
    format?: string
  }>
};

export class RangeQueryConvertHandler implements QueryConvertHandler {
  // eslint-disable-next-line class-methods-use-this
  tryConvert(query: RangeQuery): QueryConvertResult {
    const canHandle = Object.prototype.hasOwnProperty.call(query, 'range');

    if (!canHandle) {
      return { success: false };
    }

    const queryObject: ElasticsearchRangeQuery = {
      range: {
        [query.range.field]: {
          lt: query.range.lt,
          gt: query.range.gt,
          lte: query.range.lte,
          gte: query.range.gte
        }
      }
    };

    return { success: true, result: queryObject };
  }
}
