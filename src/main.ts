import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { configureApp, setupSwagger } from './app.setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = app.get(Logger);
  app.useLogger(logger);
  configureApp(app);

  const config = app.get(ConfigService);
  if (config.get('NODE_ENV') !== 'production') setupSwagger(app);

  app.enableShutdownHooks(); // close DB connections on SIGTERM/SIGINT

  const port = config.get<number>('PORT', 3000);
  await app.listen(port);
  logger.log(`Listening on port ${port}`, 'Bootstrap');
}

bootstrap().catch((err) => {
  console.error('Fatal error during startup', err);
  process.exit(1);
});
