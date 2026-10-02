import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createApp, registerAndLogin } from './helpers';

describe('Tasks API (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let otherToken: string;

  const api = (t: string) => {
    const auth = { Authorization: `Bearer ${t}` };
    const server = () => request(app.getHttpServer());
    return {
      get: (url: string) => server().get(url).set(auth),
      post: (url: string) => server().post(url).set(auth),
      patch: (url: string) => server().patch(url).set(auth),
      delete: (url: string) => server().delete(url).set(auth),
    };
  };

  beforeAll(async () => {
    app = await createApp();
    token = await registerAndLogin(app, 'owner@example.com');
    otherToken = await registerAndLogin(app, 'other@example.com');
  });

  afterAll(() => app.close());

  it('creates, reads, updates and deletes a task', async () => {
    const me = api(token);
    const created = await me
      .post('/v1/tasks')
      .send({ title: '  Write tests ', priority: 'high' })
      .expect(201);
    expect(created.body).toMatchObject({
      title: 'Write tests',
      status: 'todo',
      priority: 'high',
    });
    const { id } = created.body;

    await me.get(`/v1/tasks/${id}`).expect(200);

    const updated = await me
      .patch(`/v1/tasks/${id}`)
      .send({ status: 'done' })
      .expect(200);
    expect(updated.body.status).toBe('done');

    await me.delete(`/v1/tasks/${id}`).expect(204);
    await me.get(`/v1/tasks/${id}`).expect(404);
    await me.delete(`/v1/tasks/${id}`).expect(404);
  });

  it("hides other users' tasks (404) and keeps lists separate", async () => {
    const me = api(token);
    const other = api(otherToken);
    const { body } = await me
      .post('/v1/tasks')
      .send({ title: 'Private' })
      .expect(201);

    await other.get(`/v1/tasks/${body.id}`).expect(404);
    await other
      .patch(`/v1/tasks/${body.id}`)
      .send({ title: 'Hijacked' })
      .expect(404);
    await other.delete(`/v1/tasks/${body.id}`).expect(404);

    const list = await other.get('/v1/tasks').expect(200);
    expect(list.body.data).toEqual([]);

    // Untouched for the real owner
    const mine = await me.get(`/v1/tasks/${body.id}`).expect(200);
    expect(mine.body.title).toBe('Private');
  });

  it('ignores a client-supplied ownerId', async () => {
    const res = await api(token)
      .post('/v1/tasks')
      .send({ title: 'x', ownerId: '00000000-0000-0000-0000-000000000000' })
      .expect(400);
    expect(res.body.message).toEqual(
      expect.arrayContaining(['property ownerId should not exist']),
    );
  });

  it('rejects invalid and unknown fields', async () => {
    const res = await api(token)
      .post('/v1/tasks')
      .send({ title: '', status: 'nope', hacker: true })
      .expect(400);
    expect(res.body.statusCode).toBe(400);
    expect(res.body.message).toEqual(
      expect.arrayContaining(['property hacker should not exist']),
    );
  });

  it('rejects malformed ids', () =>
    api(token).get('/v1/tasks/not-a-uuid').expect(400));

  it('filters, searches and paginates', async () => {
    const me = api(token);
    for (const title of ['Alpha 100%', 'Beta', 'Gamma']) {
      await me.post('/v1/tasks').send({ title, status: 'in_progress' });
    }
    const filtered = await me
      .get('/v1/tasks?status=in_progress&limit=2&page=1&sortBy=title&order=ASC')
      .expect(200);
    expect(filtered.body.data).toHaveLength(2);
    expect(filtered.body.meta).toMatchObject({ limit: 2, page: 1 });
    expect(filtered.body.meta.total).toBeGreaterThanOrEqual(3);

    // '%' is matched literally, not as a wildcard; search is case-insensitive
    const search = await me.get('/v1/tasks?search=alpha%20100%25').expect(200);
    expect(search.body.data.map((t: { title: string }) => t.title)).toEqual([
      'Alpha 100%',
    ]);

    await me.get('/v1/tasks?limit=1000').expect(400);
    await me.get('/v1/tasks?sortBy=title;DROP').expect(400);
  });

  it('reports health', () =>
    request(app.getHttpServer()).get('/health').expect(200));
});
