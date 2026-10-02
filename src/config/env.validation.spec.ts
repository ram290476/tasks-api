import 'reflect-metadata';
import { validate } from './env.validation';

const valid = {
  DATABASE_URL: 'postgres://u:p@localhost:5432/db',
  JWT_SECRET: 'x'.repeat(32),
};

describe('env validation', () => {
  it('applies defaults and coerces types', () => {
    const env = validate({ ...valid, PORT: '8080', DB_SSL: 'false' });
    expect(env.PORT).toBe(8080);
    expect(env.DB_SSL).toBe(false);
    expect(env.JWT_EXPIRES_IN_SECONDS).toBe(900);
    expect(env.TRUST_PROXY_HOPS).toBe(0);
  });

  it.each([
    ['missing DATABASE_URL', { JWT_SECRET: valid.JWT_SECRET }],
    ['missing JWT_SECRET', { DATABASE_URL: valid.DATABASE_URL }],
    ['short JWT_SECRET', { ...valid, JWT_SECRET: 'short' }],
    ['empty JWT_SECRET', { ...valid, JWT_SECRET: '' }],
    ['bad PORT', { ...valid, PORT: '99999' }],
    ['bad LOG_LEVEL', { ...valid, LOG_LEVEL: 'loud' }],
  ])('rejects %s', (_name, env) => {
    expect(() => validate(env)).toThrow(/Invalid environment configuration/);
  });
});
