import type { BoolQuery, Query } from '../types';
import { QueryBuilder } from './builder';

export class BoolQueryBuilder extends QueryBuilder {
  private readonly _must: (QueryBuilder | Query)[];
  private readonly _should: (QueryBuilder | Query)[];
  private readonly _not: (QueryBuilder | Query)[];
  private readonly _filter: (QueryBuilder | Query)[];

  constructor() {
    super();

    this._must = [];
    this._should = [];
    this._not = [];
    this._filter = [];
  }

  build(): BoolQuery | Query {
    const queryObj: BoolQuery = {
      bool: {}
    };

    if (this._must.length > 0) {
      queryObj.bool.must = this._must.map((query) => (query instanceof QueryBuilder ? query.build() : query));
    }

    if (this._should.length > 0) {
      queryObj.bool.should = this._should.map((query) => (query instanceof QueryBuilder ? query.build() : query));
    }

    if (this._not.length > 0) {
      queryObj.bool.not = this._not.map((query) => (query instanceof QueryBuilder ? query.build() : query));
    }

    if (this._filter.length > 0) {
      queryObj.bool.filter = this._filter.map((query) => (query instanceof QueryBuilder ? query.build() : query));
    }

    if (this._not.length == 0 && (this._must.length + this._should.length + this._filter.length) == 1) {
      return Object.values(queryObj.bool)[0]![0]!;
    }

    return queryObj;
  }

  must(...queries: (QueryBuilder | Query)[]): BoolQueryBuilder {
    this._must.push(...queries);
    return this;
  }

  should(...queries: (QueryBuilder | Query)[]): BoolQueryBuilder {
    this._should.push(...queries);
    return this;
  }

  not(...queries: (QueryBuilder | Query)[]): BoolQueryBuilder {
    this._not.push(...queries);
    return this;
  }

  filter(...queries: (QueryBuilder | Query)[]): BoolQueryBuilder {
    this._filter.push(...queries);
    return this;
  }
}
