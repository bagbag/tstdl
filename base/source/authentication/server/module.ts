import { container } from '#/container';
import type { Type } from '#/types';
import { isDefined } from '#/utils/type-guards';
import { AuthenticationCredentialsRepository } from './authentication-credentials.repository';
import { AuthenticationSessionRepository } from './authentication-session.repository';
import { AuthenticationTokenPayloadProvider } from './authentication-token-payload.provider';
import { AuthenticationServiceOptions } from './authentication.service';

export type AuthenticationModuleConfig = {
  serviceOptions: AuthenticationServiceOptions,
  credentialsRepository: Type<AuthenticationCredentialsRepository>,
  sessionRepository: Type<AuthenticationSessionRepository>,
  tokenPayloadProvider?: Type<AuthenticationTokenPayloadProvider<any, any>>
};

export function configureAuthenticationServer(config: AuthenticationModuleConfig): void {
  container.register(AuthenticationServiceOptions, { useValue: config.serviceOptions });
  container.registerSingleton(AuthenticationCredentialsRepository, { useToken: config.credentialsRepository });
  container.registerSingleton(AuthenticationSessionRepository, { useToken: config.sessionRepository });

  if (isDefined(config.tokenPayloadProvider)) {
    container.registerSingleton(AuthenticationTokenPayloadProvider, { useToken: config.tokenPayloadProvider });
  }
}
