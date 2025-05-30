import { Array } from '#/schema/index.js';
import { DocumentRequestsTemplate, DocumentRequestTemplate } from '../models/index.js';

export class DocumentRequestsTemplateView extends DocumentRequestsTemplate {
  @Array(DocumentRequestTemplate)
  requestTemplates: DocumentRequestTemplate[];
}

export class DocumentRequestsTemplateData {
  @Array(DocumentRequestsTemplateView)
  templates: DocumentRequestsTemplateView[];
}
