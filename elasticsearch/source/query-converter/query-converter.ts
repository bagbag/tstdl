
import type { RequestParams } from '@elastic/elasticsearch';
import { isDefined } from '@tstdl/base/utils';
import type { QueryBody, SearchQuery } from '@tstdl/search-index/query';
import type { QueryConvertHandler } from './convert-handler';
import type { SortConverter } from './handlers';

const defaultLimit = 100;
const maxLimit = 1000;

export class QueryConverter {
  private readonly handlers: QueryConvertHandler[];
  private readonly sortConverter: SortConverter;

  constructor(sortConverter: SortConverter) {
    this.handlers = [];
    this.sortConverter = sortConverter;
  }

  registerHandler(...handlers: QueryConvertHandler[]): void {
    this.handlers.push(...handlers);
  }

  convert(query: SearchQuery, index: string): RequestParams.Search {
    if ((query.skip != undefined) && (query.cursor != undefined)) {
      throw new Error('cursor and skip cannot be used at the same time');
    }

    const from = (query.skip != undefined) ? query.skip : undefined;
    const searchAfter = (query.cursor != undefined) ? JSON.parse(query.cursor) : undefined; // eslint-disable-line @typescript-eslint/naming-convention
    const size = (query.limit != undefined) ? query.limit : defaultLimit;
    const sort = this.getSort(query);

    if (size > maxLimit) {
      throw new Error(`Limit (${size}) is above maximum allowed (${maxLimit}). Use cursor `);
    }

    const queryBody = this.convertBody(query.body);

    const body: { query: object, search_after?: string, sort?: object } = {
      query: queryBody
    };

    if (isDefined(searchAfter)) {
      body.search_after = searchAfter;
    }

    if (isDefined(sort)) {
      body.sort = sort;
    }

    const elasticQuery: RequestParams.Search = {
      index,
      body
    };

    if (isDefined(from)) {
      elasticQuery.from = from;
    }

    if (isDefined(size)) {
      elasticQuery.size = size;
    }

    return elasticQuery;
  }

  convertBody(queryBody: QueryBody): object {
    for (const handler of this.handlers) {
      const converted = handler.tryConvert(queryBody);

      if (converted.success) {
        return converted.result;
      }
    }

    throw new Error('not suitable handler for query available');
  }

  private getSort(query: SearchQuery): object | undefined {
    const querySort = (query.sort == undefined) ? [] : query.sort;
    const converted = querySort.map((sort) => this.sortConverter.convert(sort));

    return (converted.length == 0) ? undefined : converted;
  }
}
