import { inject } from '#/injector/index.js';
import { Injector } from '#/injector/injector.js';
import type { Provider } from '#/injector/provider.js';
import { isProvider } from '#/injector/provider.js';
import type { InjectionToken } from '#/injector/token.js';
import { Database, migrate } from '#/orm/server/index.js';
import type { DatabaseConfig } from '#/orm/server/module.js';
import { isDefined } from '#/utils/type-guards.js';
import { AuthenticationAncillaryService } from './authentication-ancillary.service.js';
import { AuthenticationService, AuthenticationServiceOptions } from './authentication.service.js';

export class AuthenticationModuleConfig {
  database?: DatabaseConfig;
  serviceOptions?: AuthenticationServiceOptions | Provider<AuthenticationServiceOptions>;

  /** override default AuthenticationService */
  authenticationService?: InjectionToken<AuthenticationService<any, any, any>>;
  authenticationAncillaryService?: InjectionToken<AuthenticationAncillaryService<any, any, any>>;
}

export function configureAuthenticationServer(config: AuthenticationModuleConfig): void {
  Injector.register(AuthenticationModuleConfig, { useValue: config });

  if (isDefined(config.serviceOptions)) {
    Injector.register(AuthenticationServiceOptions, isProvider(config.serviceOptions) ? config.serviceOptions : { useValue: config.serviceOptions });
  }
  else {
    throw new Error('Either serviceOptions or serviceOptionsToken must be provided.');
  }

  if (isDefined(config.authenticationService)) {
    Injector.registerSingleton(AuthenticationService, { useToken: config.authenticationService });
  }

  if (isDefined(config.authenticationAncillaryService)) {
    Injector.registerSingleton(AuthenticationAncillaryService, { useToken: config.authenticationAncillaryService });
  }
}

export async function migrateAuthenticationSchema(): Promise<void> {
  const connection = inject(AuthenticationModuleConfig, undefined, { optional: true })?.database?.connection;
  const database = inject(Database, connection);

  await migrate(
    database,
    {
      migrationsSchema: 'authentication',
      migrationsTable: '_migrations',
      migrationsFolder: import.meta.resolve('./drizzle').replace('file://', '')
    }
  );
}
