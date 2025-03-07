import { Table } from '#/orm/decorators.js';

export function DocumentManagementTable() {
  return Table({ schema: 'document_management' });
}
