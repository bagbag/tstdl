import { Table, type TableOptions } from '#/orm/decorators.js';
import type { TypedOmit } from '#/types.js';

export function DocumentManagementTable(options?: TypedOmit<TableOptions, 'schema'>) {
  return Table({ ...options, schema: 'document_management' });
}
