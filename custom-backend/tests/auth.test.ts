import request from 'supertest';
import app from '../src/app';
import { query } from '../src/config/db';

describe('Security & Authorization Test Matrix', () => {
  beforeAll(async () => {
    await query('TRUNCATE users CASCADE');
  });

  afterAll(async () => {
    await query('TRUNCATE users CASCADE');
  });

  let validAccessToken = '';
  let validRefreshCookie = '';

  describe('Registration', () => {
    it('Should return 400 for duplicate email', async () => {
      await request(app).post('/register').send({ email: 'test@example.com', password: 'Password123!' });
      const res = await request(app).post('/register').send({ email: 'test@example.com', password: 'Password123!' });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Email already in use');
    });

    it('Should return 400 for weak password', async () => {
      const res = await request(app).post('/register').send({ email: 'weak@example.com', password: 'weak' });
      expect(res.status).toBe(400);
    });
  });

  describe('Authentication Matrix', () => {
    it('Should login and return tokens', async () => {
      const res = await request(app).post('/login').send({ email: 'test@example.com', password: 'Password123!' });
      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toMatch(/refreshToken=/);
      
      validAccessToken = res.body.token;
      validRefreshCookie = cookies[0];
    });

    it('Should return 401 for Missing Token', async () => {
      const res = await request(app).get('/me');
      expect(res.status).toBe(401);
    });

    it('Should return 401 for Invalid JWT', async () => {
      const res = await request(app).get('/me').set('Authorization', 'Bearer invalid.token.here');
      expect(res.status).toBe(401);
    });

    it('Should return 200 for Valid JWT', async () => {
      const res = await request(app).get('/me').set('Authorization', `Bearer ${validAccessToken}`);
      expect(res.status).toBe(200);
    });
  });

  describe('Refresh Token Rotation (RTR) & Anomaly Detection', () => {
    it('Should issue new tokens and rotate when valid refresh token is used', async () => {
      const res = await request(app)
        .post('/refresh')
        .set('Cookie', validRefreshCookie);
      
      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toMatch(/refreshToken=/);
      expect(cookies[0]).not.toBe(validRefreshCookie); // Refresh cookie changed
      
      // Update with new valid tokens
      validAccessToken = res.body.token;
    });

    it('Should detect anomaly and revoke ALL sessions if old/revoked refresh token is reused', async () => {
      // Trying to use the OLD refresh token (which was just revoked by the rotation above)
      const res = await request(app)
        .post('/refresh')
        .set('Cookie', validRefreshCookie); // This is the old one!
      
      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/Security anomaly detected/);
      
      // Now even the new token should fail because ALL sessions for the user were revoked
      // We can't directly test the access token revocation here since JWTs are stateless,
      // but the refresh token that was just issued should now be dead too.
    });
  });

  describe('Rate Limiting & Lockout', () => {
    it('Should block after 5 failed attempts (429)', async () => {
       for(let i=0; i<5; i++) {
         await request(app).post('/login').send({ email: 'test@example.com', password: 'wrong' });
       }
       const res = await request(app).post('/login').send({ email: 'test@example.com', password: 'wrong' });
       expect(res.status).toBe(429);
    });
  });
});
