import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { mkdirSync } from 'fs';
import { dirname } from 'path';
import { AppModule } from './app.module';
import { configureApp, setupSwagger } from './app.setup';

async function bootstrap() {
  const dbPath = process.env.DB_PATH ?? 'data/tasks.sqlite';
  if (dbPath !== ':memory:') mkdirSync(dirname(dbPath), { recursive: true });

  const app = await NestFactory.create(AppModule);
  configureApp(app);

  const config = app.get(ConfigService);
  if (config.get('NODE_ENV') !== 'production') setupSwagger(app);

  app.enableShutdownHooks(); // close DB connections on SIGTERM/SIGINT

  const port = config.get<number>('PORT', 3000);
  await app.listen(port);
  new Logger('Bootstrap').log(`Listening on http://localhost:${port}`);
}

void bootstrap();
