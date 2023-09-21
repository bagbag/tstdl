/**
 * OIDC (OAuth 2.0) client implementation
 *
 * @module OpenID Connect
 */

import { Injector } from '#/injector/injector.js';
import { CachedOidcConfigurationService } from './cached-oidc-configuration.service.js';
import { OidcConfigurationService } from './oidc-configuration.service.js';

export * from './cached-oidc-configuration.service.js';
export * from './mongo-oidc-state.repository.js';
export * from './oidc-configuration.service.js';
export * from './oidc-state.model.js';
export * from './oidc-state.repository.js';
export * from './oidc.service-model.js';
export * from './oidc.service.js';

Injector.registerSingleton(OidcConfigurationService, { useToken: CachedOidcConfigurationService });
