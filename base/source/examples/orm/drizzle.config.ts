import { resolve } from 'node:path';

import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: resolve(__dirname, './schemas.js')
});
