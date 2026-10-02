import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { buildDataSourceOptions } from '../src/database/database.config';

/** Wipes the test database so every run starts from migrations. */
export async function resetDatabase() {
  const ds = new DataSource(
    buildDataSourceOptions({
      url: process.env.DATABASE_URL!,
      ssl: false,
      migrationsRun: false,
    }),
  );
  await ds.initialize();
  await ds.dropDatabase();
  await ds.destroy();
}

export async function createApp(): Promise<INestApplication> {
  await resetDatabase();
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init(); // runs migrations
  return app;
}

export async function registerAndLogin(
  app: INestApplication,
  email: string,
  password = 'correct-horse-battery',
): Promise<string> {
  await request(app.getHttpServer())
    .post('/v1/auth/register')
    .send({ email, password })
    .expect(201);
  const res = await request(app.getHttpServer())
    .post('/v1/auth/login')
    .send({ email, password })
    .expect(200);
  return res.body.accessToken;
}
