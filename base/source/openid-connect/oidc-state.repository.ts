import type { EntityRepository } from '#/database';
import type { OidcState } from './oidc-state.model';

export interface OidcStateRepository extends EntityRepository<OidcState> { }
