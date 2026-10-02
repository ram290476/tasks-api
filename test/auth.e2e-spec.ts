import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { createApp } from './helpers';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await createApp();
  });
  afterAll(() => app.close());

  it('registers without leaking the password hash', async () => {
    const res = await http()
      .post('/v1/auth/register')
      .send({ email: ' Jane@Example.com ', password: 'supersecret1' })
      .expect(201);
    expect(res.body.email).toBe('jane@example.com');
    expect(res.body).not.toHaveProperty('passwordHash');
    expect(res.body).not.toHaveProperty('password');
  });

  it('rejects duplicate emails (case-insensitive) and weak input', async () => {
    await http()
      .post('/v1/auth/register')
      .send({ email: 'JANE@example.com', password: 'supersecret1' })
      .expect(409);
    await http()
      .post('/v1/auth/register')
      .send({ email: 'not-an-email', password: 'short' })
      .expect(400);
  });

  it('logs in and returns a bearer token', async () => {
    const res = await http()
      .post('/v1/auth/login')
      .send({ email: 'jane@example.com', password: 'supersecret1' })
      .expect(200);
    expect(res.body).toMatchObject({ tokenType: 'Bearer', expiresIn: 900 });
    expect(typeof res.body.accessToken).toBe('string');
  });

  it('gives the same 401 for wrong password and unknown email', async () => {
    const wrong = await http()
      .post('/v1/auth/login')
      .send({ email: 'jane@example.com', password: 'wrong-password' })
      .expect(401);
    const unknown = await http()
      .post('/v1/auth/login')
      .send({ email: 'nobody@example.com', password: 'wrong-password' })
      .expect(401);
    expect(wrong.body.message).toBe(unknown.body.message);
  });

  it('protects task routes but leaves health public', async () => {
    await http().get('/v1/tasks').expect(401);
    await http()
      .get('/v1/tasks')
      .set('Authorization', 'Bearer garbage')
      .expect(401);
    await http().get('/health').expect(200);
  });

  it('rejects expired tokens and tokens signed with another secret', async () => {
    const jwt = new JwtService({ secret: process.env.JWT_SECRET });
    const expired = await jwt.signAsync(
      { sub: 'x', email: 'x@x.com' },
      { expiresIn: -10 },
    );
    await http()
      .get('/v1/tasks')
      .set('Authorization', `Bearer ${expired}`)
      .expect(401);

    const forged = await new JwtService({
      secret: 'another-secret-another-secret-123456',
    }).signAsync({ sub: 'x', email: 'x@x.com' });
    await http()
      .get('/v1/tasks')
      .set('Authorization', `Bearer ${forged}`)
      .expect(401);
  });
});
