import { join } from 'path';
import { DataSourceOptions } from 'typeorm';
import { Task } from '../tasks/entities/task.entity';
import { User } from '../users/user.entity';

export interface DbSettings {
  url: string;
  ssl: boolean;
  migrationsRun: boolean;
  poolMax: number;
}

/** Single source of truth shared by the Nest app and the TypeORM CLI. */
export function buildDataSourceOptions(db: DbSettings): DataSourceOptions {
  return {
    type: 'postgres',
    url: db.url,
    ssl: db.ssl ? { rejectUnauthorized: true } : false,
    // Postgres 13+ has gen_random_uuid() built in: no CREATE EXTENSION needed.
    uuidExtension: 'pgcrypto',
    installExtensions: false,
    entities: [User, Task],
    // Works from both ts (tests) and compiled js (dist).
    migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
    migrationsRun: db.migrationsRun,
    extra: {
      max: db.poolMax,
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 30_000,
      statement_timeout: 30_000, // abort runaway queries
    },
    synchronize: false, // schema changes go through migrations only
  };
}
