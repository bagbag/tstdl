import { Singleton } from '#/injector/decorators.js';
import type { ProvidersItem } from '#/injector/injector.js';
import { factoryProvider } from '#/injector/provider.js';
import { DatabaseConfig } from '#/orm/server/module.js';
import { DocumentManagementConfig } from '../module.js';

export const documentManagementDatabaseConfigFactoryProvider = factoryProvider((_, context) => context.resolve(DocumentManagementConfig).database ?? context.resolve(DatabaseConfig, undefined, { skipSelf: true }));

export const documentManagementDatabaseConfigProvider: ProvidersItem = {
  provide: DatabaseConfig,
  ...documentManagementDatabaseConfigFactoryProvider,
};

export function DocumentManagementSingleton() {
  return Singleton({ providers: [documentManagementDatabaseConfigProvider] });
}
