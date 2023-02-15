import type { ApiClientImplementation } from '#/api';
import { container } from '#/container';
import { configureHttpClient } from '#/http/client/module';
import type { Type } from '#/types';
import { isDefined } from '#/utils/type-guards';
import type { AuthenticationApiDefinition } from '../authentication.api';
import { waitForAuthenticationCredentialsMiddleware } from './http-client.middleware';
import { AUTHENTICATION_API_CLIENT, INITIAL_AUTHENTICATION_DATA } from './tokens';

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
