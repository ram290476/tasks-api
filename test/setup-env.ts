// Runs before test modules are imported, so ConfigModule validation sees these.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ??=
  'postgres://postgres:postgres@localhost:5432/tasks_test';
process.env.JWT_SECRET ??= 'test-secret-test-secret-test-secret-1234';
