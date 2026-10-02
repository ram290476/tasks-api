// Runs before test modules are imported, so ConfigModule validation sees these.
process.env.NODE_ENV = 'test';
process.env.DB_PATH = ':memory:';
process.env.THROTTLE_LIMIT = '1000';
