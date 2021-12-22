import { injectable } from '#/container';
import type { EntityTransformer, TypedIndexDescription } from '#/database/mongo';
import { Collection, mapTo, MongoEntityRepository } from '#/database/mongo';
import { Logger } from '#/logger';
import type { TypedOmit } from '#/types';
import type { OidcState } from './oidc-state.model';
import type { OidcStateRepository } from './oidc-state.repository';

export type MongoOidcState = TypedOmit<OidcState, 'expiration'> & { expiration: Date };

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

@injectable()
export class MongoOidcStateRepository extends MongoEntityRepository<OidcState, MongoOidcState> implements OidcStateRepository {
  constructor(collection: Collection<MongoOidcState>, logger: Logger) {
    super(collection, transformer, { logger, indexes });
  }
}
