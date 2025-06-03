import { Injector } from '#/injector/injector.js';
import { DocumentManagementAuthorizationService } from '../authorization/document-management-authorization.service.js';
import { DocumentManagementConfig } from './module.js';
import { DocumentManagementAncillaryService } from './services/index.js';

export function configureDocumentManagement(config: DocumentManagementConfig): void {
  Injector.register(DocumentManagementConfig, { useValue: config });
  Injector.register(DocumentManagementAncillaryService, { useToken: config.ancillaryService });
  Injector.register(DocumentManagementAuthorizationService, { useToken: config.authorizationService });
}
