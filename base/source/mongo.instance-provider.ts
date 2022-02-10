import { container } from '#/container';
import type { Entity } from '#/database';
import type { MongoRepositoryConfig } from '#/database/mongo';
import { Collection } from '#/database/mongo';
import type { MongoEntityRepository } from '#/database/mongo/mongo-entity-repository';
import { Logger } from '#/logger';
import type { Type } from '#/types';
import { FactoryMap } from '#/utils/factory-map';
import { singleton } from '#/utils/singleton';

type MongoRepositoryStatic<T extends Entity, TDb extends Entity> = Type<MongoEntityRepository<T, TDb>, [Collection<TDb>, Logger]>;

const databaseRepositorySingletonScopes = new FactoryMap<string, symbol>(() => Symbol('database-repository-singletons'));

let repositoryLogPrefix = 'REPO';

export function configureMongoInstanceProvider(
  options: {
    repositoryLogPrefix?: string
  }
): void {
  repositoryLogPrefix = options.repositoryLogPrefix ?? repositoryLogPrefix;
}

export async function getMongoRepository<T extends Entity, TDb extends Entity = T, C extends MongoRepositoryStatic<T, TDb> = MongoRepositoryStatic<T, TDb>>(ctor: C, collectionConfig: MongoRepositoryConfig<T, TDb>): Promise<InstanceType<C>> {
  const key = JSON.stringify(collectionConfig);
  const scope = databaseRepositorySingletonScopes.get(key);

  return singleton(scope, ctor, async () => {
    const logger = await container.resolveAsync(Logger, repositoryLogPrefix);
    const collection = await container.resolveAsync(Collection, collectionConfig) as Collection<TDb, TDb>;
    const repository = new ctor(collection, logger) as InstanceType<C>;
    await repository.initialize();

    return repository;
  });
}
