import type { ApiClientImplementation } from '#/api/index.js';
import { HTTP_CLIENT_MIDDLEWARE } from '#/http/client/tokens.js';
import { getCurrentInjector } from '#/injector/inject.js';
import { Injector } from '#/injector/injector.js';
import type { Type } from '#/types/index.js';
import { isDefined } from '#/utils/type-guards.js';
import type { AuthenticationApiDefinition } from '../authentication.api.js';
import { AuthenticationClientService } from './authentication.service.js';
import { waitForAuthenticationCredentialsMiddleware } from './http-client.middleware.js';
import { AUTHENTICATION_API_CLIENT, INITIAL_AUTHENTICATION_DATA } from './tokens.js';

/**
 * Configuration for {@link configureAuthenticationClient}
 */
export type AuthenticationClientModuleConfig = {
  /**
   * Optional custom authentication api client
   */
  authenticationApiClient?: Type<ApiClientImplementation<AuthenticationApiDefinition<any, any, any>>>,

  /**
   * Optional initial authentication data
   */
  initialAuthenticationData?: unknown,

  /**
   * Whether to register the {@link waitForAuthenticationCredentialsMiddleware} for all http clients.
   *
   * @default false
   */
  registerMiddleware?: boolean,
};

/**
 * Configures authentication client services.
 * @param config Configuration
 * @param injector The injector to use. If not provided, the current injector is used.
 */
export function configureAuthenticationClient(config: AuthenticationClientModuleConfig, injector = getCurrentInjector()): void {
  if (isDefined(config.authenticationApiClient)) {
    (injector ?? Injector).registerSingleton(AUTHENTICATION_API_CLIENT, { useToken: config.authenticationApiClient });
  }

  if (isDefined(config.initialAuthenticationData)) {
    (injector ?? Injector).register(INITIAL_AUTHENTICATION_DATA, { useValue: config.initialAuthenticationData });
  }

  if (isDefined(config.registerMiddleware)) {
    (injector ?? Injector).register(HTTP_CLIENT_MIDDLEWARE, {
      useFactory(_, context) {
        const authenticationService = context.resolve(AuthenticationClientService, undefined, { forwardRef: true, forwardRefTypeHint: 'object' });
        return waitForAuthenticationCredentialsMiddleware(authenticationService);
      },
    }, { multi: true });
  }
}
