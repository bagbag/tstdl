import type { StringMap } from '@tstdl/base/types';
import type { RegexQuery } from '@tstdl/search-index/query';
import type { QueryConvertHandler, QueryConvertResult } from '../convert-handler';

type ElasticsearchRegexQuery = { regexp: StringMap<string> };

export class RegexQueryConvertHandler implements QueryConvertHandler {
  // eslint-disable-next-line class-methods-use-this
  tryConvert(query: RegexQuery): QueryConvertResult {
    const canHandle = Object.prototype.hasOwnProperty.call(query, 'regex');

    if (!canHandle) {
      return { success: false };
    }

    const queryObject: ElasticsearchRegexQuery = {
      regexp: {
        [query.regex.field]: query.regex.expression
      }
    };

    return { success: true, result: queryObject };
  }
}
