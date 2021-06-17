import type { MatchAllQuery } from '@tstdl/search-index/query';
import type { QueryConvertHandler, QueryConvertResult } from '../convert-handler';

// eslint-disable-next-line @typescript-eslint/naming-convention
type ElasticsearchMatchAllQuery = { match_all: {} };

export class MatchAllQueryConvertHandler implements QueryConvertHandler {
  // eslint-disable-next-line class-methods-use-this
  tryConvert(query: MatchAllQuery): QueryConvertResult {
    const canHandle = Object.prototype.hasOwnProperty.call(query, 'matchAll');

    if (!canHandle) {
      return { success: false };
    }

    const queryObject: ElasticsearchMatchAllQuery = {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      match_all: {}
    };

    return { success: true, result: queryObject };
  }
}
