import type { Provider } from '#/container/index.js';
import { container, isProvider } from '#/container/index.js';
import type { Type } from '#/types.js';
import { isDefined } from '#/utils/type-guards.js';
import { AuthenticationCredentialsRepository } from './authentication-credentials.repository.js';
import { AuthenticationSessionRepository } from './authentication-session.repository.js';
import { AuthenticationSubjectResolver } from './authentication-subject.resolver.js';
import { AuthenticationTokenPayloadProvider } from './authentication-token-payload.provider.js';
import { AuthenticationService, AuthenticationServiceOptions } from './authentication.service.js';

export type AuthenticationModuleConfig = {
  serviceOptions: AuthenticationServiceOptions | Provider<AuthenticationServiceOptions>,
  credentialsRepository: Type<AuthenticationCredentialsRepository>,
  sessionRepository: Type<AuthenticationSessionRepository>,

  /** override default AuthenticationService */
  authenticationService?: Type<AuthenticationService<any, any>>,
  tokenPayloadProvider?: Type<AuthenticationTokenPayloadProvider<any, any>>,
  subjectResolver?: Type<AuthenticationSubjectResolver>
};

export function configureAuthenticationServer(config: AuthenticationModuleConfig): void {
  container.register(AuthenticationServiceOptions, isProvider(config.serviceOptions) ? config.serviceOptions : { useValue: config.serviceOptions });
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
