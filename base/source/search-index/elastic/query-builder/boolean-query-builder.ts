import type { ElasticBooleanQuery, ElasticQuery } from '../model/elastic-query.js';

export class BoolQueryBuilder {
  readonly #must: ElasticQuery[];
  readonly #should: ElasticQuery[];
  readonly #mustNot: ElasticQuery[];
  readonly #filter: ElasticQuery[];

  get totalQueries(): number {
    return this.#must.length + this.#should.length + this.#mustNot.length + this.#filter.length;
  }

  constructor() {
    this.#must = [];
    this.#should = [];
    this.#mustNot = [];
    this.#filter = [];
  }

  build(): ElasticQuery {
    const queryObj: ElasticBooleanQuery = {
      bool: {}
    };

    if (this.#must.length > 0) {
      queryObj.bool.must = this.#must;
    }

    if (this.#should.length > 0) {
      queryObj.bool.should = this.#should;
    }

    if (this.#mustNot.length > 0) {
      queryObj.bool.must_not = this.#mustNot;
    }

    if (this.#filter.length > 0) {
      queryObj.bool.filter = this.#filter;
    }

    if (this.#mustNot.length == 0 && (this.#must.length + this.#should.length + this.#filter.length) == 1) {
      return [...this.#must, ...this.#should, ...this.#filter][0]!;
    }

    return queryObj;
  }

  must(...queries: ElasticQuery[]): this {
    this.#must.push(...queries);
    return this;
  }

  should(...queries: ElasticQuery[]): this {
    this.#should.push(...queries);
    return this;
  }

  mustNot(...queries: ElasticQuery[]): this {
    this.#mustNot.push(...queries);
    return this;
  }

  filter(...queries: ElasticQuery[]): this {
    this.#filter.push(...queries);
    return this;
  }
}
