import type { InjectionToken, Provider } from '#/container/index.js';
import { container, isProvider } from '#/container/index.js';
import { isDefined } from '#/utils/type-guards.js';
import { AuthenticationCredentialsRepository } from './authentication-credentials.repository.js';
import { AuthenticationSessionRepository } from './authentication-session.repository.js';
import { AuthenticationSubjectResolver } from './authentication-subject.resolver.js';
import { AuthenticationTokenPayloadProvider } from './authentication-token-payload.provider.js';
import { AuthenticationService, AuthenticationServiceOptions } from './authentication.service.js';

export type AuthenticationModuleConfig = {
  serviceOptions?: AuthenticationServiceOptions | Provider<AuthenticationServiceOptions>,
  credentialsRepository: InjectionToken<AuthenticationCredentialsRepository>,
  sessionRepository: InjectionToken<AuthenticationSessionRepository>,

  /** override default AuthenticationService */
  authenticationService?: InjectionToken<AuthenticationService<any, any>>,
  tokenPayloadProvider?: InjectionToken<AuthenticationTokenPayloadProvider<any, any>>,
  subjectResolver?: InjectionToken<AuthenticationSubjectResolver>
};

export function configureAuthenticationServer(config: AuthenticationModuleConfig): void {
  if (isDefined(config.serviceOptions)) {
    container.register(AuthenticationServiceOptions, isProvider(config.serviceOptions) ? config.serviceOptions : { useValue: config.serviceOptions });
  }
  else {
    throw new Error('Either serviceOptions or serviceOptionsToken must be provided.');
  }

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
