import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { buildDataSourceOptions } from './database/database.config';
import {
  validate,
  Environment,
  EnvironmentVariables,
} from './config/env.validation';
import { HealthModule } from './health/health.module';
import { TasksModule } from './tasks/tasks.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService<EnvironmentVariables, true>) => ({
        pinoHttp: {
          level: cfg.get('LOG_LEVEL', { infer: true }),
          // Never write credentials to logs.
          redact: ['req.headers.authorization', 'req.headers.cookie'],
          autoLogging: { ignore: (req) => req.url === '/health' },
        },
      }),
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService<EnvironmentVariables, true>) => ({
        throttlers: [
          {
            ttl: cfg.get('THROTTLE_TTL_MS', { infer: true }),
            limit: cfg.get('THROTTLE_LIMIT', { infer: true }),
          },
        ],
        // Keeps e2e runs deterministic; rate limits are exercised in dev/prod.
        skipIf: () => cfg.get('NODE_ENV', { infer: true }) === Environment.Test,
      }),
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService<EnvironmentVariables, true>) =>
        buildDataSourceOptions({
          url: cfg.get('DATABASE_URL', { infer: true }),
          ssl: cfg.get('DB_SSL', { infer: true }),
          migrationsRun: cfg.get('DB_MIGRATIONS_RUN', { infer: true }),
          poolMax: cfg.get('DB_POOL_MAX', { infer: true }),
        }),
    }),
    AuthModule,
    TasksModule,
    HealthModule,
  ],
  providers: [
    // Order matters: throttle first, then authenticate.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
