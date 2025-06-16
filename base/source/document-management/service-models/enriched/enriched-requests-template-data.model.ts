import type { TypedOmit } from '#/types.js';
import { assertDefinedPass } from '#/utils/type-guards.js';
import type { DocumentRequestTemplate } from '../../models/index.js';
import type { DocumentRequestsTemplateData, DocumentRequestsTemplateView } from '../document-requests-template.view-model.js';
import type { EnrichedDocumentCategory } from '../enriched/enriched-document-category.view.js';
import type { EnrichedDocumentManagementData } from '../enriched/enriched-document-management-data.view.js';
import type { EnrichedDocumentType } from '../enriched/enriched-document-type.view.js';

export type EnrichedDocumentRequestsTemplateData = TypedOmit<DocumentRequestsTemplateData, 'templates'> & {
  templates: EnrichedDocumentRequestsTemplateView[],
  categories: EnrichedDocumentCategory[],
  types: EnrichedDocumentType[],
};

export type EnrichedDocumentRequestsTemplateView = TypedOmit<DocumentRequestsTemplateView, 'requestTemplates'> & {
  requestTemplates: EnrichedDocumentRequestTemplate[],
};

export type EnrichedDocumentRequestTemplate = TypedOmit<DocumentRequestTemplate, 'typeId'> & {
  type: EnrichedDocumentType,
};

export function toEnrichedDocumentRequestsTemplateData(templateData: DocumentRequestsTemplateData, documentManagementData: EnrichedDocumentManagementData): EnrichedDocumentRequestsTemplateData {
  return {
    templates: templateData.templates.map((template) => ({
      ...template,
      requestTemplates: template.requestTemplates.map((requestTemplate): EnrichedDocumentRequestTemplate => ({
        ...requestTemplate,
        type: assertDefinedPass(documentManagementData.maps.types.get(requestTemplate.typeId)),
      })),
    })),
    categories: documentManagementData.categories,
    types: documentManagementData.types,
  };
}
