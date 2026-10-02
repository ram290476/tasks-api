// Used by the TypeORM CLI only (see the `migration:*` npm scripts).
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from './database.config';

export default new DataSource(
  buildDataSourceOptions({
    url: process.env.DATABASE_URL ?? '',
    ssl: process.env.DB_SSL === 'true',
    migrationsRun: false,
    poolMax: 2,
  }),
);
