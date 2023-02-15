import type { ApiClientHttpRequestContext } from '#/api/client';
import { container } from '#/container';
import type { HttpClientRequest, HttpClientResponse } from '#/http';
import type { HttpClientMiddleware, HttpClientMiddlewareNext } from '#/http/client/http-client';
import { assertFunctionPass, isNotFunction, isUndefined } from '#/utils/type-guards';
import { firstValueFrom } from 'rxjs';
import { dontWaitForValidToken } from '../authentication.api';
import { AuthenticationService } from './authentication.service';

export type AuthenticationServiceProvider = () => (AuthenticationService<any, any> | Promise<AuthenticationService<any, any>>);

export const defaultAuthenticationServiceProvider = async () => container.resolveAsync(AuthenticationService);

export function waitForAuthenticationCredentialsMiddleware(authenticationService: AuthenticationService | AuthenticationServiceProvider = defaultAuthenticationServiceProvider): HttpClientMiddleware {
  let service: AuthenticationService | undefined = isNotFunction(authenticationService) ? authenticationService : undefined;

  // eslint-disable-next-line @typescript-eslint/no-shadow
  async function waitForAuthenticationCredentialsMiddleware(request: HttpClientRequest, next: HttpClientMiddlewareNext, context: unknown): Promise<HttpClientResponse> {
    const endpoint = (context as Partial<ApiClientHttpRequestContext> | undefined)?.endpoint;

    if ((endpoint?.credentials == true) && (endpoint.data?.[dontWaitForValidToken] != true)) {
      if (isUndefined(service)) {
        service = await assertFunctionPass<AuthenticationServiceProvider>(authenticationService)(); // eslint-disable-line require-atomic-updates
      }

      while (!service.hasValidToken) {
        await firstValueFrom(service.validToken$);
      }
    }

    return next(request);
  }

  return waitForAuthenticationCredentialsMiddleware;
}
