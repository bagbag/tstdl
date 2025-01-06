import type { TypedOmit } from '#/types.js';

import type { DocumentRequestTemplate } from '../document-request-template.js';
import type { DocumentRequestsTemplateData, DocumentRequestsTemplateView } from './document-requests-template.view-model.js';
import type { NormalizedDocumentCategory, NormalizedDocumentManagementData, NormalizedDocumentType } from './normalized-document-collection-view.model.js';

export type NormalizedDocumentRequestsTemplateData = TypedOmit<DocumentRequestsTemplateData, 'templates'> & {
  templates: NormalizedDocumentRequestsTemplateView[],
  categories: NormalizedDocumentCategory[],
  types: NormalizedDocumentType[]
};

export type NormalizedDocumentRequestsTemplateView = TypedOmit<DocumentRequestsTemplateView, 'requestTemplates'> & {
  requestTemplates: NormalizedDocumentRequestTemplate[]
};

export type NormalizedDocumentRequestTemplate = TypedOmit<DocumentRequestTemplate, 'typeId'> & {
  type: NormalizedDocumentType | null
};

export function toNormalizedDocumentRequestsTemplateData(templateData: DocumentRequestsTemplateData, documentManagementData: NormalizedDocumentManagementData): NormalizedDocumentRequestsTemplateData { // eslint-disable-line max-lines-per-function
  return {
    templates: templateData.templates.map((template) => ({
      ...template,
      requestTemplates: template.requestTemplates.map((requestTemplate): NormalizedDocumentRequestTemplate => ({
        ...requestTemplate,
        type: documentManagementData.types.find((type) => type.id == requestTemplate.typeId) ?? null
      }))
    })),
    categories: documentManagementData.categories,
    types: documentManagementData.types
  };
}
