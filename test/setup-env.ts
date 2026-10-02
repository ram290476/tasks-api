import { randomBytes } from 'crypto';

// Runs before test modules are imported, so ConfigModule validation sees these.
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';
process.env.JWT_SECRET ??= randomBytes(32).toString('hex'); // fresh per run
if (!process.env.DATABASE_URL) {
  throw new Error(
    'Set DATABASE_URL to a throwaway Postgres database (it is wiped on every e2e run).',
  );
}
