import { Array } from '#/schema/index.js';

import { DocumentRequestTemplate } from '../document-request-template.js';
import { DocumentRequestsTemplate } from '../document-requests-template.js';

export class DocumentRequestsTemplateView extends DocumentRequestsTemplate {
  @Array(DocumentRequestTemplate)
  requestTemplates: DocumentRequestTemplate[];
}

export class DocumentRequestsTemplateData {
  @Array(DocumentRequestsTemplateView)
  templates: DocumentRequestsTemplateView[];
}
