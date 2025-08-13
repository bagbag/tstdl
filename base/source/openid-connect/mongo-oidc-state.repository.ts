import type { CollectionArgument, EntityTransformer, MongoRepositoryConfig, TypedIndexDescription } from '#/database/mongo/index.js';
import { Collection, MongoEntityRepository, mapTo } from '#/database/mongo/index.js';
import type { Resolvable } from '#/injector/index.js';
import { ForwardArg, ResolveArg, Singleton, resolveArgumentType } from '#/injector/index.js';
import { Injector } from '#/injector/injector.js';
import type { LoggerArgument } from '#/logger/index.js';
import { Logger } from '#/logger/index.js';
import type { TypedOmit } from '#/types/index.js';
import type { OidcState } from './oidc-state.model.js';
import { OidcStateRepository } from './oidc-state.repository.js';

export type MongoOidcState = TypedOmit<OidcState, 'expiration'> & { expiration: Date };

let repositoryConfig: MongoRepositoryConfig<OidcState, MongoOidcState> | undefined;

const indexes: TypedIndexDescription<MongoOidcState>[] = [
  { key: { value: 1 }, unique: true },
  { key: { expiration: 1 }, expireAfterSeconds: 1 }
];

const transformer: EntityTransformer<OidcState, MongoOidcState> = {
  transform: (state) => ({ ...state, expiration: new Date(state.expiration) }),
  untransform: (state) => ({ ...state, expiration: state.expiration.getTime() }),
  mapping: {
    expiration: mapTo('expiration', (timestamp) => new Date(timestamp))
  }
};

@Singleton({ defaultArgumentProvider: () => repositoryConfig })
export class MongoOidcStateRepository extends MongoEntityRepository<OidcState, MongoOidcState> implements OidcStateRepository, Resolvable<CollectionArgument<MongoOidcState>> {
  declare readonly [resolveArgumentType]: CollectionArgument<MongoOidcState>;
  constructor(@ForwardArg() collection: Collection<MongoOidcState>, @ResolveArg<LoggerArgument>('MongoOidcStateRepository') logger: Logger) {
    super(collection, transformer, { logger, indexes });
  }
}

/**
 * configure mongo oidc state repository module
 * @param mongoOidcStateRepositoryConfig repository configuration for states
 * @param register whether to register for {@link OidcStateRepository}
 */
export function configureMongoOidcStateRepository(mongoOidcStateRepositoryConfig: MongoRepositoryConfig<OidcState, MongoOidcState>, register: boolean = true): void {
  repositoryConfig = mongoOidcStateRepositoryConfig;

  if (register) {
    Injector.registerSingleton(OidcStateRepository, { useToken: MongoOidcStateRepository });
  }
}
