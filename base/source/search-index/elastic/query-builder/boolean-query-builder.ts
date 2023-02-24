import type { ElasticBooleanQuery, ElasticQuery } from '../model/elastic-query.js';

export class BoolQueryBuilder {
  private readonly _must: ElasticQuery[];
  private readonly _should: ElasticQuery[];
  private readonly _mustNot: ElasticQuery[];
  private readonly _filter: ElasticQuery[];

  get totalQueries(): number {
    return this._must.length + this._should.length + this._mustNot.length + this._filter.length;
  }

  constructor() {
    this._must = [];
    this._should = [];
    this._mustNot = [];
    this._filter = [];
  }

  build(): ElasticQuery {
    const queryObj: ElasticBooleanQuery = {
      bool: {}
    };

    if (this._must.length > 0) {
      queryObj.bool.must = this._must;
    }

    if (this._should.length > 0) {
      queryObj.bool.should = this._should;
    }

    if (this._mustNot.length > 0) {
      queryObj.bool.must_not = this._mustNot;
    }

    if (this._filter.length > 0) {
      queryObj.bool.filter = this._filter;
    }

    if (this._mustNot.length == 0 && (this._must.length + this._should.length + this._filter.length) == 1) {
      return [...this._must, ...this._should, ...this._filter][0]!;
    }

    return queryObj;
  }

  must(...queries: ElasticQuery[]): this {
    this._must.push(...queries);
    return this;
  }

  should(...queries: ElasticQuery[]): this {
    this._should.push(...queries);
    return this;
  }

  mustNot(...queries: ElasticQuery[]): this {
    this._mustNot.push(...queries);
    return this;
  }

  filter(...queries: ElasticQuery[]): this {
    this._filter.push(...queries);
    return this;
  }
}
