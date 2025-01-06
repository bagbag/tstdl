import './models/schemas.js';

import { migrate } from 'drizzle-orm/node-postgres/migrator';

import { inject, Injector, type InjectionToken } from '#/injector/index.js';
import { Database } from '#/orm/database.js';
import type { DatabaseConfig } from '#/orm/module.js';
import { isDefined } from '#/utils/type-guards.js';
import { DocumentManagementService } from './services/document-management.service.js';

export class DocumentManagementConfig {
  fileObjectStorageModule: string;
  database: DatabaseConfig;
  customService?: InjectionToken<DocumentManagementService>;
};

export function configureDocumentManagement(config: DocumentManagementConfig): void {
  Injector.register(DocumentManagementConfig, { useValue: config });

  if (isDefined(config.customService)) {
    Injector.register(DocumentManagementService, { useToken: config.customService });
  }
}

export async function migrateDocumentManagementSchema(): Promise<void> {
  const config = inject(DocumentManagementConfig);
  const database = inject(Database, config.database.connection);

  await migrate(
    database,
    {
      migrationsSchema: 'document_management',
      migrationsTable: '_migrations',
      migrationsFolder: import.meta.resolve('./drizzle').replace('file://', '')
    }
  );
}
