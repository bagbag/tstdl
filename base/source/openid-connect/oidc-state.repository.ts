import { EntityRepository } from '#/database';
import type { OidcState } from './oidc-state.model';

export abstract class OidcStateRepository extends EntityRepository<OidcState> { }
