import { Injector } from '#/injector/injector.js';
import { DocumentManagementConfig } from './module.js';
import { DocumentManagementAncillaryService } from './services/document-management-ancillary.service.js';
import { DocumentManagementAuthorizationService } from './services/document-management-authorization.service.js';


export function configureDocumentManagement(config: DocumentManagementConfig): void {
  Injector.register(DocumentManagementConfig, { useValue: config });
  Injector.register(DocumentManagementAncillaryService, { useToken: config.ancillaryService });
  Injector.register(DocumentManagementAuthorizationService, { useToken: config.authorizationService });
}
