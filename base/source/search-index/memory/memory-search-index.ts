import type { ComparisonTextQuery, Entity, Query, QueryOptions } from '#/database/index.js';
import { compareByValueSelectionOrdered } from '#/utils/comparison.js';
import { FactoryMap } from '#/utils/factory-map.js';
import { objectEntries } from '#/utils/object/object.js';
import { intersectSets, unionSets } from '#/utils/set.js';
import { normalizeText } from '#/utils/string/index.js';
import { Timer } from '#/utils/timer.js';
import { isDefined, isNullOrUndefined, isString } from '#/utils/type-guards.js';
import { SearchIndex } from '../search-index.js';
import type { SearchResult, SearchResultItem } from '../search-result.js';

export class MemorySearchIndex<T extends Entity> extends SearchIndex<T> {
  private readonly indexedFields: (keyof T)[];
  private readonly allSet: Set<T>;
  private readonly idMap: Map<string, T>;
  private readonly indexMap: FactoryMap<PropertyKey, FactoryMap<string | null | undefined, Set<T>>>;

  constructor(indexedFields: (keyof T)[]) {
    super();

    this.indexedFields = indexedFields;

    this.allSet = new Set();
    this.idMap = new Map();
    this.indexMap = new FactoryMap(() => new FactoryMap(() => new Set()));
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async index(entities: T[]): Promise<void> {
    for (const entity of entities) {
      this._delete(entity.id);
      this.indexEntity(entity);
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async delete(id: string): Promise<void> {
    this._delete(id);
  }

  async deleteByQuery(query: Query<T>): Promise<void> {
    const searchResult = await this.search(query);

    for (const item of searchResult.items) {
      this.deleteEntity(item.entity);
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await, max-statements, max-lines-per-function
  async search(queryOrCursor: string | Query<T>, options: QueryOptions<T> = {}): Promise<SearchResult<T>> {
    if (isString(queryOrCursor)) {
      throw new Error('cursor not supported');
    }

    const timer = new Timer(true);
    const entries = objectEntries(queryOrCursor);

    let items: T[];

    if (entries.length == 0) {
      items = [...this.allSet];
    }
    else {
      const sets: Set<T>[] = [];

      for (const [field, query] of entries) {
        const textQuery = (query as ComparisonTextQuery).$text;
        const queryIsString = isString(textQuery);

        const text = queryIsString ? textQuery : textQuery.text;
        const and = queryIsString ? true : textQuery.operator != 'or';

        const innerSets: Set<T>[] = [];

        if (isString(text)) {
          const tokens = normalizeText(text).split(' ').filter((token) => token.length > 0);

          if (tokens.length == 0) {
            innerSets.push(this.allSet);
          }

          for (const token of tokens) {
            innerSets.push(this.indexMap.get(field).get(token));
          }
        }

        const innerEntries = and ? intersectSets(...innerSets) : unionSets(...innerSets);
        sets.push(new Set(innerEntries));
      }

      items = intersectSets(...sets);
    }

    if (isDefined(options.sort)) {
      items.sort(compareByValueSelectionOrdered(...options.sort.map((sort) => [(item: T) => item[sort.field as keyof T], sort.order == 'desc' ? -1 : 1] as const)));
    }

    if (isDefined(options.skip) || isDefined(options.limit)) {
      const start = options.skip ?? 0;
      const end = isDefined(options.limit) ? (start + options.limit) : undefined;
      items = items.slice(start, end);
    }

    const resultItems = items.map((item): SearchResultItem<T> => ({ entity: item, score: 1 }));

    const result: SearchResult<T> = {
      total: resultItems.length,
      totalIsLowerBound: false,
      milliseconds: timer.milliseconds,
      items: resultItems
    };

    return result;
  }

  async count(query?: Query<T>, options?: QueryOptions<T> | undefined): Promise<number> {
    const items = await this.searchAll(query ?? {}, options);
    return items.length;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async drop(): Promise<void> {
    this.allSet.clear();
    this.idMap.clear();
    this.indexMap.clear();
  }

  private _delete(id: string): void {
    const entity = this.idMap.get(id);

    if (isDefined(entity)) {
      this.deleteEntity(entity);
    }
  }

  private indexEntity(entity: T): void {
    this.allSet.add(entity);
    this.idMap.set(entity.id, entity);

    for (const field of this.indexedFields) {
      const value = entity[field];
      const tokens = getTokens(value);

      for (const token of tokens) {
        this.indexMap.get(field as string).get(token).add(entity);
      }
    }
  }

  private deleteEntity(entity: T): void {
    for (const field of this.indexedFields) {
      const value = entity[field];
      const tokens = getTokens(value);

      for (const token of tokens) {
        this.indexMap.get(field).get(token).delete(entity);
      }
    }

    this.allSet.delete(entity);
    this.idMap.delete(entity.id);
  }
}

function getTokens(value: any): (string | null | undefined)[] {
  if (isNullOrUndefined(value)) {
    return [value];
  }

  if (!isString(value)) {
    throw new Error('value is neither string nor null or undefined');
  }

  const normalizedParts = normalizeText(value).split(' ');
  const tokens = new Set<string>();

  for (const part of normalizedParts) {
    for (let i = 0; i < part.length; i++) {
      for (let j = i; j < part.length; j++) {
        tokens.add(part.slice(i, j + 1));
      }
    }
  }

  return [...tokens];
}
