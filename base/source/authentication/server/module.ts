import { container } from '#/container';
import type { Type } from '#/types';
import { isDefined } from '#/utils/type-guards';
import { AuthenticationCredentialsRepository } from './authentication-credentials.repository';
import { AuthenticationSessionRepository } from './authentication-session.repository';
import { AuthenticationSubjectResolver } from './authentication-subject.resolver';
import { AuthenticationTokenPayloadProvider } from './authentication-token-payload.provider';
import { AuthenticationService, AuthenticationServiceOptions } from './authentication.service';

export type AuthenticationModuleConfig = {
  serviceOptions: AuthenticationServiceOptions,
  credentialsRepository: Type<AuthenticationCredentialsRepository>,
  sessionRepository: Type<AuthenticationSessionRepository>,

  /** override default AuthenticationService */
  authenticationService?: Type<AuthenticationService<any, any>>,
  tokenPayloadProvider?: Type<AuthenticationTokenPayloadProvider<any, any>>,
  subjectResolver?: Type<AuthenticationSubjectResolver>
};

export function configureAuthenticationServer(config: AuthenticationModuleConfig): void {
  container.register(AuthenticationServiceOptions, { useValue: config.serviceOptions });
  container.registerSingleton(AuthenticationCredentialsRepository, { useToken: config.credentialsRepository });
  container.registerSingleton(AuthenticationSessionRepository, { useToken: config.sessionRepository });

  if (isDefined(config.authenticationService)) {
    container.registerSingleton(AuthenticationService, { useToken: config.authenticationService });
  }

  if (isDefined(config.tokenPayloadProvider)) {
    container.registerSingleton(AuthenticationTokenPayloadProvider, { useToken: config.tokenPayloadProvider });
  }

  if (isDefined(config.subjectResolver)) {
    container.registerSingleton(AuthenticationSubjectResolver, { useToken: config.subjectResolver });
  }
}