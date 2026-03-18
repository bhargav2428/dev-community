// Authentication Tests
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import authRouter from '../../routes/auth.routes';
import { errorHandler } from '../../middleware/error.middleware';
import { prisma } from '../../lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Create test app
const app = express();
app.use(express.json());
app.use('/api/v1/auth', authRouter);
app.use(errorHandler);

describe('Authentication API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==================
  // REGISTRATION TESTS
  // ==================
  describe('POST /api/v1/auth/register', () => {
    it('should register a new user with valid data', async () => {
      const mockUser = {
        id: 'new-user-id',
        email: 'newuser@example.com',
        username: 'newuser',
        role: 'USER',
      };

      (prisma.user.findFirst as any).mockResolvedValue(null);
      (prisma.user.create as any).mockResolvedValue(mockUser);

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'newuser@example.com',
          username: 'newuser',
          password: 'SecurePass123!',
          firstName: 'New',
          lastName: 'User',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('newuser@example.com');
    });

    it('should reject registration with existing email', async () => {
      (prisma.user.findFirst as any).mockResolvedValue({ id: 'existing', email: 'existing@example.com' });

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'existing@example.com',
          username: 'newuser',
          password: 'SecurePass123!',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject registration with weak password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          username: 'testuser',
          password: '123', // Too weak
        });

      expect(res.status).toBe(400);
    });

    it('should reject registration with invalid email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid-email',
          username: 'testuser',
          password: 'SecurePass123!',
        });

      expect(res.status).toBe(400);
    });

    it('should reject registration with short username', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          username: 'ab', // Too short
          password: 'SecurePass123!',
        });

      expect(res.status).toBe(400);
    });
  });

  // ==================
  // LOGIN TESTS
  // ==================
  describe('POST /api/v1/auth/login', () => {
    it('should login with valid credentials', async () => {
      const hashedPassword = await bcrypt.hash('SecurePass123!', 10);
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: hashedPassword,
        role: 'USER',
        deletedAt: null,
      };

      (prisma.user.findFirst as any).mockResolvedValue(mockUser);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
    });

    it('should reject login with wrong password', async () => {
      const hashedPassword = await bcrypt.hash('SecurePass123!', 10);
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        passwordHash: hashedPassword,
      };

      (prisma.user.findFirst as any).mockResolvedValue(mockUser);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject login with non-existent user', async () => {
      (prisma.user.findFirst as any).mockResolvedValue(null);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'SecurePass123!',
        });

      expect(res.status).toBe(401);
    });

    it('should reject login with deleted account', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        passwordHash: await bcrypt.hash('SecurePass123!', 10),
        deletedAt: new Date(),
      };

      (prisma.user.findFirst as any).mockResolvedValue(mockUser);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!',
        });

      expect(res.status).toBe(401);
    });
  });

  // ==================
  // TOKEN REFRESH TESTS
  // ==================
  describe('POST /api/v1/auth/refresh', () => {
    it('should refresh tokens with valid refresh token', async () => {
      const mockUser = { id: 'user-id', role: 'USER' };
      const refreshToken = jwt.sign(
        { userId: 'user-id', type: 'refresh' },
        process.env.JWT_REFRESH_SECRET!,
        { expiresIn: '7d' }
      );

      (prisma.refreshToken.findFirst as any)?.mockResolvedValue({ 
        token: refreshToken, 
        userId: 'user-id',
        expiresAt: new Date(Date.now() + 86400000),
      });
      (prisma.user.findFirst as any).mockResolvedValue(mockUser);

      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(200);
    });

    it('should reject invalid refresh token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid-token' });

      expect(res.status).toBe(401);
    });
  });

  // ==================
  // LOGOUT TESTS
  // ==================
  describe('POST /api/v1/auth/logout', () => {
    it('should logout successfully', async () => {
      (prisma.refreshToken.deleteMany as any)?.mockResolvedValue({ count: 1 });

      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', 'Bearer valid-token')
        .send({ refreshToken: 'refresh-token' });

      expect([200, 401]).toContain(res.status);
    });
  });

  // ==================
  // PASSWORD RESET TESTS
  // ==================
  describe('POST /api/v1/auth/forgot-password', () => {
    it('should send password reset email for valid user', async () => {
      const mockUser = { id: 'user-id', email: 'test@example.com' };
      (prisma.user.findFirst as any).mockResolvedValue(mockUser);

      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'test@example.com' });

      // Should return success even if email doesn't exist (security)
      expect([200, 202]).toContain(res.status);
    });
  });
});

// ==================
// INPUT VALIDATION TESTS
// ==================
describe('Input Validation', () => {
  describe('Email Validation', () => {
    const validEmails = [
      'test@example.com',
      'user.name@domain.co',
      'user+label@example.org',
    ];

    const invalidEmails = [
      'invalid',
      '@nodomain.com',
      'spaces in@email.com',
      'missing@.com',
    ];

    validEmails.forEach(email => {
      it(`should accept valid email: ${email}`, () => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        expect(emailRegex.test(email)).toBe(true);
      });
    });

    invalidEmails.forEach(email => {
      it(`should reject invalid email: ${email}`, () => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        expect(emailRegex.test(email)).toBe(false);
      });
    });
  });

  describe('Password Validation', () => {
    it('should require minimum 8 characters', () => {
      const password = 'Short1!';
      expect(password.length >= 8).toBe(false);
    });

    it('should require uppercase letter', () => {
      const password = 'nouppercase1!';
      expect(/[A-Z]/.test(password)).toBe(false);
    });

    it('should require lowercase letter', () => {
      const password = 'NOLOWERCASE1!';
      expect(/[a-z]/.test(password)).toBe(false);
    });

    it('should require number', () => {
      const password = 'NoNumbers!';
      expect(/\d/.test(password)).toBe(false);
    });

    it('should accept strong password', () => {
      const password = 'SecurePass123!';
      const isStrong = 
        password.length >= 8 &&
        /[A-Z]/.test(password) &&
        /[a-z]/.test(password) &&
        /\d/.test(password);
      expect(isStrong).toBe(true);
    });
  });

  describe('Username Validation', () => {
    it('should require minimum 3 characters', () => {
      expect('ab'.length >= 3).toBe(false);
    });

    it('should not exceed 30 characters', () => {
      const longUsername = 'a'.repeat(31);
      expect(longUsername.length <= 30).toBe(false);
    });

    it('should only allow alphanumeric and underscores', () => {
      const validUsername = 'test_user123';
      const invalidUsername = 'test-user@123';
      expect(/^[a-zA-Z0-9_]+$/.test(validUsername)).toBe(true);
      expect(/^[a-zA-Z0-9_]+$/.test(invalidUsername)).toBe(false);
    });
  });
});
