import type { Injectable } from '#/container';
import { injectable, injectArg, resolveArgumentType } from '#/container';
import type { Entity } from '#/database';
import { isString } from '#/utils/type-guards';

export type ElasticSearchIndexConfigArgument<T extends Entity = Entity> = string | ElasticSearchIndexConfig<T>;

@injectable()
export abstract class ElasticSearchIndexConfig<T extends Entity = Entity> implements Injectable<ElasticSearchIndexConfigArgument> {
  readonly indexName: string;
  readonly [resolveArgumentType]: ElasticSearchIndexConfigArgument<T>;

  constructor(@injectArg() indexNameOrConfig: string | ElasticSearchIndexConfig<T>) {
    this.indexName = isString(indexNameOrConfig) ? indexNameOrConfig : indexNameOrConfig.indexName;
  }
}
