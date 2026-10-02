import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';

describe('Tasks API (e2e)', () => {
  let app: INestApplication;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(() => app.close());

  it('creates, reads, updates and deletes a task', async () => {
    const created = await http()
      .post('/v1/tasks')
      .send({ title: '  Write tests ', priority: 'high' })
      .expect(201);
    expect(created.body).toMatchObject({
      title: 'Write tests',
      status: 'todo',
      priority: 'high',
    });
    const { id } = created.body;

    await http().get(`/v1/tasks/${id}`).expect(200);

    const updated = await http()
      .patch(`/v1/tasks/${id}`)
      .send({ status: 'done' })
      .expect(200);
    expect(updated.body.status).toBe('done');

    await http().delete(`/v1/tasks/${id}`).expect(204);
    await http().get(`/v1/tasks/${id}`).expect(404);
    await http().delete(`/v1/tasks/${id}`).expect(404);
  });

  it('rejects invalid and unknown fields', async () => {
    const res = await http()
      .post('/v1/tasks')
      .send({ title: '', status: 'nope', hacker: true })
      .expect(400);
    expect(res.body.statusCode).toBe(400);
    expect(res.body.message).toEqual(
      expect.arrayContaining(['property hacker should not exist']),
    );
  });

  it('rejects malformed ids', () =>
    http().get('/v1/tasks/not-a-uuid').expect(400));

  it('filters, searches and paginates', async () => {
    for (const title of ['Alpha 100%', 'Beta', 'Gamma']) {
      await http().post('/v1/tasks').send({ title, status: 'in_progress' });
    }
    const filtered = await http()
      .get('/v1/tasks?status=in_progress&limit=2&page=1&sortBy=title&order=ASC')
      .expect(200);
    expect(filtered.body.data).toHaveLength(2);
    expect(filtered.body.meta).toMatchObject({ limit: 2, page: 1 });
    expect(filtered.body.meta.total).toBeGreaterThanOrEqual(3);

    // '%' is matched literally, not as a wildcard
    const search = await http().get('/v1/tasks?search=100%25').expect(200);
    expect(search.body.data.map((t: { title: string }) => t.title)).toEqual([
      'Alpha 100%',
    ]);

    await http().get('/v1/tasks?limit=1000').expect(400);
    await http().get('/v1/tasks?sortBy=title;DROP').expect(400);
  });

  it('reports health', () => http().get('/health').expect(200));
});
