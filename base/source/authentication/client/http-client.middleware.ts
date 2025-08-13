import { firstValueFrom } from 'rxjs';

import type { ApiClientHttpRequestContext } from '#/api/client/index.js';
import type { HttpClientMiddleware, HttpClientMiddlewareContext, HttpClientMiddlewareNext } from '#/http/client/middleware.js';
import { cacheValueOrAsyncProvider, type ValueOrAsyncProvider } from '#/utils/value-or-provider.js';
import { dontWaitForValidToken } from '../authentication.api.js';
import type { AuthenticationClientService } from './authentication.service.js';

/**
 * A http client middleware that waits for a valid token before sending a request if the endpoint requires credentials.
 * @param authenticationServiceOrProvider The authentication service or a provider for it.
 * @returns A http client middleware.
 */
export function waitForAuthenticationCredentialsMiddleware(authenticationServiceOrProvider: ValueOrAsyncProvider<AuthenticationClientService>): HttpClientMiddleware {
  const getAuthenticationService = cacheValueOrAsyncProvider(authenticationServiceOrProvider);

  async function waitForAuthenticationCredentialsMiddleware({ request }: HttpClientMiddlewareContext, next: HttpClientMiddlewareNext): Promise<void> {
    const endpoint = (request.context as Partial<ApiClientHttpRequestContext> | undefined)?.endpoint;

    if ((endpoint?.credentials == true) && (endpoint.data?.[dontWaitForValidToken] != true)) {
      const authenticationService = await getAuthenticationService();

      while (!authenticationService.hasValidToken) {
        await firstValueFrom(authenticationService.validToken$);
      }
    }

    await next();
  }

  return waitForAuthenticationCredentialsMiddleware;
}
