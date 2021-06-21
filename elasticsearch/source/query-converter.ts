import type { RangeQuery } from '@elastic/elasticsearch/api/types';
import { isPrimitive } from '@tstdl/base/utils';
import type { Entity } from '@tstdl/database';
import type { ComparisonEqualsQuery, ComparisonGreaterThanOrEqualsQuery, ComplexTextSpanQuery, ComparisonGreaterThanQuery, ComparisonInQuery, ComparisonLessThanOrEqualsQuery, ComparisonLessThanQuery, ComparisonNotEqualsQuery, ComparisonNotInQuery, ComparisonRegexQuery, ComparisonTextQuery, LogicalAndQuery, LogicalNorQuery, LogicalOrQuery, Query } from '@tstdl/database/query';
import type { ElasticsearchMatchQuery, ElasticsearchMultiMatchQuery, ElasticsearchQuery, ElasticsearchRangeQuery, ElasticsearchRegexQuery, ElasticsearchTermQuery, ElasticsearchTermsQuery } from './model';
import { BoolQueryBuilder } from './query-builder';

// eslint-disable-next-line max-lines-per-function, max-statements, complexity
export function convertQuery<T extends Entity>(query: Query<T>): ElasticsearchQuery {
  const defaultBoolQueryBuilder = new BoolQueryBuilder();

  const queryEntries = Object.entries(query);

  // eslint-disable-next-line no-unreachable-loop
  for (const [rawProperty, value] of queryEntries) {
    const property = getPropertyName(rawProperty);
    const isPrimitiveValue = isPrimitive(value);
    const range: RangeQuery = {};

    let canHandleProperty = false;

    if (rawProperty == '$and') {
      if (queryEntries.length > 1) {
        throw new Error('only one logical operator per level allowed');
      }

      return convertLogicalAndQuery((value as LogicalAndQuery['$and']));
    }

    if (rawProperty == '$or') {
      if (queryEntries.length > 1) {
        throw new Error('only one logical operator per level allowed');
      }

      return convertLogicalOrQuery((value as LogicalOrQuery['$or']));
    }

    if (rawProperty == '$nor') {
      if (queryEntries.length > 1) {
        throw new Error('only one logical operator per level allowed');
      }

      return convertLogicalNorQuery((value as LogicalNorQuery['$nor']));
    }

    if (isPrimitiveValue || Object.prototype.hasOwnProperty.call(value, '$eq')) {
      const termQuery: ElasticsearchTermQuery = {
        term: { [property]: isPrimitiveValue ? value : (value as ComparisonEqualsQuery).$eq }
      };

      defaultBoolQueryBuilder.must(termQuery);
      canHandleProperty = true;
    }

    if (Object.prototype.hasOwnProperty.call(value, '$neq')) {
      const termQuery: ElasticsearchTermQuery = {
        term: { [property]: (value as ComparisonNotEqualsQuery).$neq }
      };

      defaultBoolQueryBuilder.mustNot(termQuery);
      canHandleProperty = true;
    }

    if (Object.prototype.hasOwnProperty.call(value, '$in')) {
      const termQuery: ElasticsearchTermsQuery = {
        terms: { [property]: (value as ComparisonInQuery).$in }
      };

      defaultBoolQueryBuilder.must(termQuery);
      canHandleProperty = true;
    }

    if (Object.prototype.hasOwnProperty.call(value, '$nin')) {
      const termQuery: ElasticsearchTermsQuery = {
        terms: { [property]: (value as ComparisonNotInQuery).$nin }
      };

      defaultBoolQueryBuilder.mustNot(termQuery);
      canHandleProperty = true;
    }

    if (Object.prototype.hasOwnProperty.call(value, '$lt')) {
      range.lt = (value as ComparisonLessThanQuery).$lt;
      canHandleProperty = true;
    }

    if (Object.prototype.hasOwnProperty.call(value, '$lte')) {
      range.lte = (value as ComparisonLessThanOrEqualsQuery).$lte;
      canHandleProperty = true;
    }

    if (Object.prototype.hasOwnProperty.call(value, '$gt')) {
      range.gt = (value as ComparisonGreaterThanQuery).$gt;
      canHandleProperty = true;
    }

    if (Object.prototype.hasOwnProperty.call(value, '$gte')) {
      range.gte = (value as ComparisonGreaterThanOrEqualsQuery).$gte;
      canHandleProperty = true;
    }

    if (Object.values(range).length > 0) {
      const rangeQuery: ElasticsearchRangeQuery = { range: { [property]: range } };
      defaultBoolQueryBuilder.must(rangeQuery);
    }

    if (Object.prototype.hasOwnProperty.call(value, '$regex')) {
      const termQuery: ElasticsearchRegexQuery = {
        regexp: { [property]: (value as ComparisonRegexQuery).$regex }
      };

      defaultBoolQueryBuilder.must(termQuery);
      canHandleProperty = true;
    }

    if (Object.prototype.hasOwnProperty.call(value, '$text')) {
      let matchQuery: ElasticsearchMatchQuery;
      const textQueryValue = (value as ComparisonTextQuery).$text;

      if (typeof textQueryValue == 'string') {
        matchQuery = { match: { [property]: { query: textQueryValue } } };
      }
      else {
        matchQuery = { match: { [property]: { query: textQueryValue.text, operator: textQueryValue.operator } } };
      }

      defaultBoolQueryBuilder.must(matchQuery);
      canHandleProperty = true;
    }

    if (Object.prototype.hasOwnProperty.call(value, '$textSpan')) {
      const { fields, text, operator } = value as ComplexTextSpanQuery['$textSpan'];
      const matchQuery: ElasticsearchMultiMatchQuery = { multi_match: { fields, query: text, operator } };

      defaultBoolQueryBuilder.must(matchQuery);
      canHandleProperty = true;
    }

    if (!canHandleProperty) {
      throw new Error(`unsupported query type "${rawProperty}"`);
    }
  }

  if (defaultBoolQueryBuilder.totalQueries == 0) {
    return { match_all: {} };
  }

  return defaultBoolQueryBuilder.build();
}

function getPropertyName(property: string): string {
  return property == 'id' ? '_id' : property;
}

export function convertLogicalAndQuery<T extends Entity>(andQuery: LogicalAndQuery<T>['$and']): ElasticsearchQuery {
  return new BoolQueryBuilder().must(...andQuery.map(convertQuery)).build();
}

export function convertLogicalOrQuery<T extends Entity>(orQuery: LogicalOrQuery<T>['$or']): ElasticsearchQuery {
  return new BoolQueryBuilder().should(...orQuery.map(convertQuery)).build();
}

export function convertLogicalNorQuery<T extends Entity>(norQuery: LogicalNorQuery<T>['$nor']): ElasticsearchQuery {
  return new BoolQueryBuilder().mustNot(...norQuery.map(convertQuery)).build();
}
