import type { ApiClientImplementation } from '#/api/index.js';
import { HTTP_CLIENT_MIDDLEWARE } from '#/http/client/tokens.js';
import { getCurrentInjector } from '#/injector/inject.js';
import { Injector } from '#/injector/injector.js';
import type { Type } from '#/types.js';
import { isDefined } from '#/utils/type-guards.js';
import type { AuthenticationApiDefinition } from '../authentication.api.js';
import { AuthenticationService } from './authentication.service.js';
import { waitForAuthenticationCredentialsMiddleware } from './http-client.middleware.js';
import { AUTHENTICATION_API_CLIENT, INITIAL_AUTHENTICATION_DATA } from './tokens.js';

export type AuthenticationModuleConfig = {
  authenticationApiClient?: Type<ApiClientImplementation<AuthenticationApiDefinition<any, any>>>,
  initialAuthenticationData?: unknown,
  registerMiddleware?: boolean
};

export function configureAuthenticationClient(config: AuthenticationModuleConfig, injector = getCurrentInjector()): void {
  if (isDefined(config.authenticationApiClient)) {
    (injector ?? Injector).registerSingleton(AUTHENTICATION_API_CLIENT, { useToken: config.authenticationApiClient });
  }

  if (isDefined(config.initialAuthenticationData)) {
    (injector ?? Injector).register(INITIAL_AUTHENTICATION_DATA, { useValue: config.initialAuthenticationData });
  }

  if (isDefined(config.registerMiddleware)) {
    (injector ?? Injector).register(HTTP_CLIENT_MIDDLEWARE, {
      useFactory(_, context) {
        const authenticationService = context.resolve(AuthenticationService);
        return waitForAuthenticationCredentialsMiddleware(authenticationService);
      }
    }, { multi: true });
  }
}
