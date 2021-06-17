import type { IdsQuery } from '@tstdl/search-index/query';
import type { QueryConvertHandler, QueryConvertResult } from '../convert-handler';

type ElasticsearchIdsQuery = {
  ids: {
    type?: string | string[],
    values: string[]
  }
};

export class IdsQueryConvertHandler implements QueryConvertHandler {
  // eslint-disable-next-line class-methods-use-this
  tryConvert(query: IdsQuery): QueryConvertResult {
    const canHandle = Object.prototype.hasOwnProperty.call(query, 'ids');

    if (!canHandle) {
      return { success: false };
    }

    const queryObject: ElasticsearchIdsQuery = {
      ids: {
        values: query.ids
      }
    };

    return { success: true, result: queryObject };
  }
}
