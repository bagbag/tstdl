import type { MatchAllQuery } from '../types';
import { QueryBuilder } from './builder';

export class MatchAllQueryBuilder extends QueryBuilder {
  build(): MatchAllQuery {
    return {
      matchAll: {}
    };
  }
}
