import { container } from '#/container/index.js';
import { CachedOidcConfigurationService } from './cached-oidc-configuration.service.js';
import { OidcConfigurationService } from './oidc-configuration.service.js';

export * from './cached-oidc-configuration.service.js';
export * from './mongo-oidc-state.repository.js';
export * from './oidc-configuration.service.js';
export * from './oidc-state.model.js';
export * from './oidc-state.repository.js';
export * from './oidc.service.js';
export * from './oidc.service-model.js';

container.registerSingleton(OidcConfigurationService, { useToken: CachedOidcConfigurationService });
