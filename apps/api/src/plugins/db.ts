import { sql } from 'drizzle-orm';
import fp from 'fastify-plugin';
import type { Database } from '../db/client.js';
import { createDb } from '../db/client.js';

export const dbPlugin = fp(async (app) => {
  const { pool, db } = createDb(app.config.DATABASE_URL, {
    max: app.config.DB_POOL_MAX,
    statementTimeoutMs: app.config.DB_STATEMENT_TIMEOUT_MS,
  });
  app.decorate('db', db);
  app.addHook('onClose', async () => {
    await pool.end();
  });
});

export async function checkDatabase(db: Database): Promise<void> {
  await db.execute(sql`select 1`);
}
