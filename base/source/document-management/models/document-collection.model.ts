import { Entity } from '#/orm/entity.js';
import { DocumentManagementTable } from './document-management-table.js';

@DocumentManagementTable()
export class DocumentCollection extends Entity { }
