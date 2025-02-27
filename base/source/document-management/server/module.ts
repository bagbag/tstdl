import './schemas.js';

import { inject, Injector, type InjectionToken } from '#/injector/index.js';
import { Database, migrate } from '#/orm/server/database.js';
import type { DatabaseConfig } from '#/orm/server/module.js';
import { isDefined } from '#/utils/type-guards.js';
import { DocumentManagementService } from './services/document-management.service.js';

export class DocumentManagementConfig {
  fileObjectStorageModule: string;
  database?: DatabaseConfig;
  customService?: InjectionToken<DocumentManagementService>;
};

export function configureDocumentManagement(config: DocumentManagementConfig): void {
  Injector.register(DocumentManagementConfig, { useValue: config });

  if (isDefined(config.customService)) {
    Injector.register(DocumentManagementService, { useToken: config.customService });
  }
}

export async function migrateDocumentManagementSchema(): Promise<void> {
  const connection = inject(DocumentManagementConfig, undefined, { optional: true })?.database?.connection;
  const database = inject(Database, connection);

  await migrate(
    database,
    {
      migrationsSchema: 'document_management',
      migrationsTable: '_migrations',
      migrationsFolder: import.meta.resolve('./drizzle').replace('file://', '')
    }
  );
}
