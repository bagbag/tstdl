import type { BoolQuery, QueryBody } from '@tstdl/search-index/query';
import type { QueryConvertHandler, QueryConvertResult } from '../convert-handler';
import type { QueryConverter } from '../query-converter';

type ElasticsearchBooleanQuery = {
  bool: {
    must?: object[],
    should?: object[],
    must_not?: object[], // eslint-disable-line @typescript-eslint/naming-convention
    filter?: object[]
  }
};

export class BoolQueryConvertHandler implements QueryConvertHandler {
  private readonly queryConverter: QueryConverter;

  constructor(queryConverter: QueryConverter) {
    this.queryConverter = queryConverter;
  }

  tryConvert(query: BoolQuery): QueryConvertResult {
    const canHandle = Object.prototype.hasOwnProperty.call(query, 'bool');

    if (!canHandle) {
      return { success: false };
    }

    const queryObject: ElasticsearchBooleanQuery = {
      bool: {
        must: this.convertArray(query.bool.must),
        should: this.convertArray(query.bool.should),
        must_not: this.convertArray(query.bool.not), // eslint-disable-line @typescript-eslint/naming-convention
        filter: this.convertArray(query.bool.filter)
      }
    };

    return { success: true, result: queryObject };
  }

  private convertArray(queries: QueryBody[] | undefined): object[] | undefined {
    if (queries == undefined) {
      return undefined;
    }

    const converted = queries.map((query) => this.queryConverter.convertBody(query));
    return converted;
  }
}
