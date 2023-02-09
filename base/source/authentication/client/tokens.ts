import type { ApiClient } from '#/api/client';
import { injectionToken } from '#/container';
import type { AuthenticationApiDefinition } from '../authentication.api';

export const AUTHENTICATION_API_CLIENT = injectionToken<ApiClient<AuthenticationApiDefinition<any, any>>>('AUTHENTICATION_API_CLIENT');

export const INITIAL_AUTHENTICATION_DATA = injectionToken('INITIAL_AUTHENTICATION_DATA');
