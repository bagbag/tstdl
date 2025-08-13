import type { ApiClientImplementation } from '#/api/index.js';
import { Injector } from '#/injector/injector.js';
import { injectionToken } from '#/injector/token.js';
import type { AuthenticationApiDefinition } from '../authentication.api.js';
import { AuthenticationApiClient } from './api.client.js';

/**
 * Injection token for {@link AuthenticationApiClient}
 */
export const AUTHENTICATION_API_CLIENT = injectionToken<ApiClientImplementation<AuthenticationApiDefinition<any, any, any>>>('ApiClientImplementation');

/**
 * Injection token for initial authentication data
 */
export const INITIAL_AUTHENTICATION_DATA = injectionToken('initial authentication data');

Injector.registerSingleton(AUTHENTICATION_API_CLIENT, { useToken: AuthenticationApiClient });
