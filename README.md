# Tasks API

A production-minded REST API built with **NestJS 11**, **PostgreSQL** (TypeORM + migrations), **JWT authentication**, Docker and GitHub Actions CI.

## Quick start

### Docker (API + Postgres)

```bash
export JWT_SECRET=$(openssl rand -base64 48)
export POSTGRES_PASSWORD=$(openssl rand -hex 24)   # hex keeps the connection URL valid
docker compose up --build
```

### Local development

```bash
cp .env.example .env           # fill in DATABASE_URL and JWT_SECRET (both required)
docker compose up -d db        # or use any Postgres 13+ (expose 5432 for the default .env)
npm install
npm run start:dev              # migrations run automatically on startup
```

Swagger UI: http://localhost:3000/docs (disabled when `NODE_ENV=production`). Use **Authorize** with the token from `/v1/auth/login`.

## Authentication

```bash
curl -XPOST localhost:3000/v1/auth/register -H 'content-type: application/json' \
  -d '{"email":"jane@example.com","password":"supersecret1"}'
curl -XPOST localhost:3000/v1/auth/login -H 'content-type: application/json' \
  -d '{"email":"jane@example.com","password":"supersecret1"}'
# -> {"accessToken":"...","tokenType":"Bearer","expiresIn":900}
curl localhost:3000/v1/tasks -H "authorization: Bearer <accessToken>"
```

- Every route requires a valid JWT unless marked `@Public()` (global guard, secure by default).
- Passwords are hashed with bcrypt (cost 12); hashes are never selected or returned.
- Login responses/timing don't reveal whether an email exists; auth routes have a stricter rate limit.
- Tokens are HS256, short-lived (`JWT_EXPIRES_IN_SECONDS`, default 15 min), stateless.
- Tasks belong to their creator; other users' tasks return 404.

## Endpoints

| Method | Path                | Auth | Description                                                  |
| ------ | ------------------- | ---- | ------------------------------------------------------------ |
| POST   | `/v1/auth/register` | –    | Create an account                                            |
| POST   | `/v1/auth/login`    | –    | Get an access token                                          |
| POST   | `/v1/tasks`         | JWT  | Create a task                                                |
| GET    | `/v1/tasks`         | JWT  | List: `page, limit, status, priority, search, sortBy, order` |
| GET    | `/v1/tasks/:id`     | JWT  | Get one                                                      |
| PATCH  | `/v1/tasks/:id`     | JWT  | Partial update                                               |
| DELETE | `/v1/tasks/:id`     | JWT  | Delete (204)                                                 |
| GET    | `/health`           | –    | Health incl. DB ping                                         |

## Configuration

See `.env.example`. Config is validated at boot; the app refuses to start with a missing `DATABASE_URL` or a `JWT_SECRET` shorter than 32 characters. No secrets have defaults.

Production notes:

- `TRUST_PROXY_HOPS`: set to the number of proxies/load balancers in front of the app, otherwise every client shares the proxy's IP for rate limiting.
- `DB_SSL=true` for managed databases; `DB_POOL_MAX` sizes the connection pool (keep it below the database's connection limit divided by replica count).
- Logs are JSON (pino) with `authorization`/`cookie` headers redacted; `LOG_LEVEL` controls verbosity. `/health` requests aren't logged.
- Tokens carry and require the issuer set in `JWT_ISSUER`. Rotating `JWT_SECRET` invalidates all issued tokens.

## Database migrations

`synchronize` is off; the schema is managed by migrations in `src/database/migrations`, applied on startup (`DB_MIGRATIONS_RUN=true`).

```bash
npm run migration:generate -- src/database/migrations/AddSomething   # diff entities vs DB
npm run migration:run
npm run migration:revert
```

When running several replicas, set `DB_MIGRATIONS_RUN=false` and run `migration:run` once as a deploy step.

## Tests and CI

```bash
npm test                                   # unit tests
export DATABASE_URL=<throwaway test database URL>   # wiped on each e2e run!
npm run test:e2e
```

`.github/workflows/ci.yml` runs on every push/PR: lint, build, e2e tests against a Postgres 16 service container, a dependency audit, then builds the Docker image and smoke-tests it against Postgres.

## Docker

Multi-stage build on `node:22-alpine`: production-only dependencies, runs as the non-root `node` user, has a `HEALTHCHECK`, and starts `node` directly so SIGTERM triggers graceful shutdown.

## Practices applied

DTO validation (`whitelist` + `forbidNonWhitelisted`), env validation, structured JSON logging with secret redaction, DB pool and statement timeouts, proxy-aware rate limiting, Dependabot, URI versioning, bounded pagination with whitelisted sort fields, `helmet`, CORS allow-list, rate limiting, global exception filter, compression, health checks, OpenAPI docs, ESLint + Prettier.

## Not included yet

Refresh tokens / token revocation, roles, email verification and password reset, metrics/tracing, and publishing the image to a registry.

> Pinned to Nest 11 because Nest 12 is ESM-only and this project uses CommonJS + Jest.
