import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

/** Shared by main.ts and e2e tests so tests exercise the real configuration. */
export function configureApp(app: INestApplication) {
  const config = app.get(ConfigService);

  app.use(helmet());
  app.use(compression());
  app.enableCors({
    origin: config.get<string>('CORS_ORIGINS')?.split(',') ?? false,
  });
  app.enableVersioning({ type: VersioningType.URI });
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip unknown properties
      forbidNonWhitelisted: true, // ...and reject them
      transform: true, // instantiate DTOs, coerce query types
    }),
  );
}

export function setupSwagger(app: INestApplication) {
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Tasks API')
      .setDescription('A simple tasks REST API')
      .setVersion('1.0')
      .build(),
  );
  SwaggerModule.setup('docs', app, document);
}
