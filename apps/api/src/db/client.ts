import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';

export type Database = ReturnType<typeof createDb>['db'];

export interface DbOptions {
  max?: number;
  statementTimeoutMs?: number;
  idleTimeoutMs?: number;
}

export function createDb(connectionString: string, options: DbOptions = {}) {
  const pool = new Pool({
    connectionString,
    max: options.max ?? 10,
    idleTimeoutMillis: options.idleTimeoutMs ?? 30_000,
    connectionTimeoutMillis: 5_000,
    options: `-c statement_timeout=${options.statementTimeoutMs ?? 10_000}`,
  });
  const db = drizzle({ client: pool, schema });
  return { pool, db };
}
