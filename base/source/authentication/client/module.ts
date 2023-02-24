import type { ApiClientImplementation } from '#/api/index.js';
import { container } from '#/container/index.js';
import { configureHttpClient } from '#/http/client/module.js';
import type { Type } from '#/types.js';
import { isDefined } from '#/utils/type-guards.js';
import type { AuthenticationApiDefinition } from '../authentication.api.js';
import { waitForAuthenticationCredentialsMiddleware } from './http-client.middleware.js';
import { AUTHENTICATION_API_CLIENT, INITIAL_AUTHENTICATION_DATA } from './tokens.js';

export type AuthenticationModuleConfig = {
  authenticationApiClient?: Type<ApiClientImplementation<AuthenticationApiDefinition<any, any>>>,
  initialAuthenticationData?: unknown,
  registerMiddleware?: boolean
};

export function configureAuthenticationClient(config: AuthenticationModuleConfig = {}): void {
  if (isDefined(config.authenticationApiClient)) {
    container.registerSingleton(AUTHENTICATION_API_CLIENT, { useToken: config.authenticationApiClient });
  }

  if (isDefined(config.initialAuthenticationData)) {
    container.register(INITIAL_AUTHENTICATION_DATA, { useValue: config.initialAuthenticationData });
  }

  if (isDefined(config.registerMiddleware)) {
    configureHttpClient({ middleware: [waitForAuthenticationCredentialsMiddleware()] });
  }
}
