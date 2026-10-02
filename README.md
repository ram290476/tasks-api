# Tasks API

A production-minded REST API built with **NestJS 11**, **TypeORM** (SQLite via `better-sqlite3`) and TypeScript.

## Quick start

```bash
cp .env.example .env
npm install
npm run start:dev      # watch mode
npm run build && npm start
npm run test:e2e       # end-to-end tests (in-memory DB)
```

Swagger UI: http://localhost:3000/docs (disabled when `NODE_ENV=production`).

## Endpoints

| Method | Path              | Description                              |
| ------ | ----------------- | ---------------------------------------- |
| POST   | `/v1/tasks`       | Create a task                            |
| GET    | `/v1/tasks`       | List: `page, limit, status, priority, search, sortBy, order` |
| GET    | `/v1/tasks/:id`   | Get one                                  |
| PATCH  | `/v1/tasks/:id`   | Partial update                           |
| DELETE | `/v1/tasks/:id`   | Delete (204)                             |
| GET    | `/health`         | Liveness/readiness incl. DB ping         |

## Practices applied

- Modular structure (feature module, controller → service → repository)
- DTO validation with `class-validator`; `whitelist` + `forbidNonWhitelisted`, type coercion, input trimming
- Env validation at boot (`ConfigModule` + `class-validator`) – fails fast on bad config
- `ParseUUIDPipe`, URI versioning (`/v1`), correct status codes (201/204/404)
- Pagination with bounded `limit`, whitelisted sort fields, stable ordering, LIKE-wildcard escaping
- Security: `helmet`, CORS allow-list, rate limiting (`@nestjs/throttler`)
- Global exception filter: uniform error shape, no internal leakage, 5xx logged
- `compression`, graceful shutdown hooks, health checks (`@nestjs/terminus`)
- OpenAPI docs, ESLint + Prettier, e2e tests sharing the real app config

## Before going to production

- Set `DB_SYNCHRONIZE=false` and add TypeORM migrations (schema auto-sync is for development).
- Swap SQLite for PostgreSQL (change the TypeORM config; `simple-enum`/`datetime` columns need `enum`/`timestamptz`).
- Add authentication/authorization (e.g. `@nestjs/jwt` + guards) – the API is currently open.
- Add structured logging (e.g. `nestjs-pino`) and a Dockerfile/CI as needed.

> Pinned to Nest 11 because Nest 12 is ESM-only and this project uses CommonJS + Jest.
