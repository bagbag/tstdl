import type { Entity } from '#/database/index.js';
import { InjectArg, Injectable } from '#/injector/decorators.js';
import type { Resolvable, resolveArgumentType } from '#/injector/interfaces.js';
import { isString } from '#/utils/type-guards.js';

export type ElasticSearchIndexConfigArgument<T extends Entity = Entity> = string | ElasticSearchIndexConfig<T>;

@Injectable()
export abstract class ElasticSearchIndexConfig<T extends Entity = Entity> implements Resolvable<ElasticSearchIndexConfigArgument> {
  readonly indexName: string;

  declare readonly [resolveArgumentType]: ElasticSearchIndexConfigArgument<T>;
  constructor(@InjectArg() indexNameOrConfig: string | ElasticSearchIndexConfig<T>) {
    this.indexName = isString(indexNameOrConfig) ? indexNameOrConfig : indexNameOrConfig.indexName;
  }
}
