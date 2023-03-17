import type { Injectable } from '#/container/index.js';
import { injectable, injectArg, type resolveArgumentType } from '#/container/index.js';
import type { Entity } from '#/database/index.js';
import { isString } from '#/utils/type-guards.js';

export type ElasticSearchIndexConfigArgument<T extends Entity = Entity> = string | ElasticSearchIndexConfig<T>;

@injectable()
export abstract class ElasticSearchIndexConfig<T extends Entity = Entity> implements Injectable<ElasticSearchIndexConfigArgument> {
  readonly indexName: string;

  declare readonly [resolveArgumentType]: ElasticSearchIndexConfigArgument<T>;
  constructor(@injectArg() indexNameOrConfig: string | ElasticSearchIndexConfig<T>) {
    this.indexName = isString(indexNameOrConfig) ? indexNameOrConfig : indexNameOrConfig.indexName;
  }
}
