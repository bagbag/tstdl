import type { QueryBody } from '@tstdl/search-index/query';

export type QueryConvertResult = { success: true, result: object } | { success: false };

export interface QueryConvertHandler {
  tryConvert(query: QueryBody): QueryConvertResult;
}
