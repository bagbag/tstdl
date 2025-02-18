import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { pgSchema, uuid } from 'drizzle-orm/pg-core';
import * as schema from './schemas.js';

const db = drizzle('', { schema });

const query = eq(schema.user, 1);

const x = pgSchema('').table('test', {
  id: uuid().defaultRandom().primaryKey()
});

await db.insert(x).values({});

const user = await db.select().from(schema.user);
