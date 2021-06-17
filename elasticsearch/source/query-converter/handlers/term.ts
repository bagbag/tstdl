import type { StringMap } from '@tstdl/base/types';
import type { TermQuery } from '@tstdl/search-index/query';
import type { QueryConvertHandler, QueryConvertResult } from '../convert-handler';

type ElasticsearchTermQuery = { term: StringMap<string | number | boolean | Date> };

export class TermQueryConvertHandler implements QueryConvertHandler {
  // eslint-disable-next-line class-methods-use-this
  tryConvert(query: TermQuery): QueryConvertResult {
    const canHandle = Object.prototype.hasOwnProperty.call(query, 'term');

    if (!canHandle) {
      return { success: false };
    }

    const queryObject: ElasticsearchTermQuery = {
      term: {
        [query.term.field]: query.term.value
      }
    };

    return { success: true, result: queryObject };
  }
}
