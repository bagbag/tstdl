import type { Query } from '../types';

export abstract class QueryBuilder {
  abstract build(): Query;
}
