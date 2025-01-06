import { relative, resolve } from 'node:path';

import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  out: relative('./', resolve(__dirname, './drizzle/').replace('dist', 'source')),
  schema: resolve(__dirname, './models/schemas.js'),
  migrations: {
    schema: 'document_management',
    table: '_orm_migrations'
  }
});
