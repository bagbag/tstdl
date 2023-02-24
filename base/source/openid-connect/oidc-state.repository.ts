import { EntityRepository } from '#/database/index.js';
import type { OidcState } from './oidc-state.model.js';

export abstract class OidcStateRepository extends EntityRepository<OidcState> { }
