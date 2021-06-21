import type { ElasticsearchBooleanQuery, ElasticsearchQuery } from '../model';

export class BoolQueryBuilder {
  private readonly _must: ElasticsearchQuery[];
  private readonly _should: ElasticsearchQuery[];
  private readonly _mustNot: ElasticsearchQuery[];
  private readonly _filter: ElasticsearchQuery[];

  get totalQueries(): number {
    return this._must.length + this._should.length + this._mustNot.length + this._filter.length;
  }

  constructor() {
    this._must = [];
    this._should = [];
    this._mustNot = [];
    this._filter = [];
  }

  build(): ElasticsearchQuery {
    const queryObj: ElasticsearchBooleanQuery = {
      bool: {}
    };

    if (this._must.length > 0) {
      queryObj.bool!.must = this._must;
    }

    if (this._should.length > 0) {
      queryObj.bool!.should = this._should;
    }

    if (this._mustNot.length > 0) {
      queryObj.bool!.must_not = this._mustNot;
    }

    if (this._filter.length > 0) {
      queryObj.bool!.filter = this._filter;
    }

    if (this._mustNot.length == 0 && (this._must.length + this._should.length + this._filter.length) == 1) {
      return Object.values(queryObj.bool)[0]![0]!;
    }

    return queryObj;
  }

  must(...queries: ElasticsearchQuery[]): this {
    this._must.push(...queries);
    return this;
  }

  should(...queries: ElasticsearchQuery[]): this {
    this._should.push(...queries);
    return this;
  }

  mustNot(...queries: ElasticsearchQuery[]): this {
    this._mustNot.push(...queries);
    return this;
  }

  filter(...queries: ElasticsearchQuery[]): this {
    this._filter.push(...queries);
    return this;
  }
}
