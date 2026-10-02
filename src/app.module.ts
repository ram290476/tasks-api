import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { validate, EnvironmentVariables } from './config/env.validation';
import { HealthModule } from './health/health.module';
import { Task } from './tasks/entities/task.entity';
import { TasksModule } from './tasks/tasks.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService<EnvironmentVariables, true>) => [
        {
          ttl: cfg.get('THROTTLE_TTL_MS', { infer: true }),
          limit: cfg.get('THROTTLE_LIMIT', { infer: true }),
        },
      ],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService<EnvironmentVariables, true>) => ({
        type: 'better-sqlite3',
        database: cfg.get('DB_PATH', { infer: true }),
        entities: [Task],
        synchronize: cfg.get('DB_SYNCHRONIZE', { infer: true }),
      }),
    }),
    TasksModule,
    HealthModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
