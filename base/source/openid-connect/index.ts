import { container } from '#/container';
import { CachedOidcConfigurationService } from './cached-oidc-configuration.service';
import { OidcConfigurationService } from './oidc-configuration.service';

export * from './cached-oidc-configuration.service';
export * from './mongo-oidc-state.repository';
export * from './oidc-configuration.service';
export * from './oidc-state.model';
export * from './oidc-state.repository';
export * from './oidc.service';
export * from './oidc.service-model';

container.registerSingleton(OidcConfigurationService, { useToken: CachedOidcConfigurationService });
