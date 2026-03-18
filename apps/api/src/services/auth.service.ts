// Authentication Service
// Handles user registration, login, token management, OAuth

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';
import { redis, cache, cacheKeys } from '../lib/redis.js';
import { config } from '../config/index.js';
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from '../utils/errors.js';
import { emailService } from './email.service.js';
import type { RegisterInput, LoginInput } from '../schemas/auth.schema.js';

// Minimal helper types for MongoDB-backed users
type UserRole = string;
type OAuthProvider = 'GOOGLE' | 'GITHUB' | string;

interface User {
  id: string;
  email: string;
  username: string;
  role?: UserRole;
  passwordHash?: string;
  deletedAt?: Date | null;
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string | null;
  emailVerified?: boolean;
  isOnline?: boolean;
  lastSeenAt?: Date | null;
  displayName?: string;
  avatar?: string;
  createdAt?: Date;
  updatedAt?: Date;
  [key: string]: any;
}

// Token types
interface TokenPayload {
  userId: string;
  email: string;
  username: string;
  role?: UserRole;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface AuthResponse {
  user: Omit<User, 'passwordHash' | 'twoFactorSecret'>;
  tokens: AuthTokens;
}

// Exclude sensitive fields from user response
const excludeSensitiveFields = (user: User) => {
  const { passwordHash, twoFactorSecret, ...safeUser } = user;
  return safeUser;
};

class AuthService {
  private readonly SALT_ROUNDS = 12;
  private readonly ACCESS_TOKEN_EXPIRY = '15m';
  private readonly REFRESH_TOKEN_EXPIRY = '7d';
  private readonly VERIFICATION_TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
  private readonly RESET_TOKEN_EXPIRY = 60 * 60 * 1000; // 1 hour

  /**
   * Register a new user
   */
  async register(data: RegisterInput): Promise<AuthResponse> {
    const { email, username, password, firstName, lastName } = data;

    // Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
        deletedAt: null,
      },
    });

    if (existingUser) {
      if (existingUser.email === email) {
        throw new BadRequestError('Email already registered');
      }
      throw new BadRequestError('Username already taken');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, this.SALT_ROUNDS);

    // Create user
    const newUser: User = {
      id: crypto.randomUUID(),
      email,
      username,
      passwordHash,
      firstName,
      lastName,
      displayName: firstName && lastName ? `${firstName} ${lastName}` : username,
      emailVerified: false,
      role: 'USER',
      isOnline: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      profile: {},
    };

    const createdUser = await prisma.user.create({ data: newUser });

    // Generate verification token
    const verificationToken = await this.createVerificationToken(
      email,
      'EMAIL_VERIFICATION'
    );

    // Send verification email
    await emailService.sendVerificationEmail(email, verificationToken);

    // Generate auth tokens
    const tokens = await this.generateTokens(createdUser);

    return {
      user: excludeSensitiveFields(createdUser),
      tokens,
    };
  }

  /**
   * Login with email and password
   */
  async login(data: LoginInput): Promise<AuthResponse> {
    const { email, password } = data;

    // Find user
    const user = (await prisma.user.findFirst({ where: { email } })) as unknown as User | null;

    if (!user || !user.passwordHash) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Check if account is deleted
    if (user.deletedAt) {
      throw new UnauthorizedError('Account has been deactivated');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Check 2FA
    if (user.twoFactorEnabled) {
      // Return partial response indicating 2FA is required
      return {
        user: excludeSensitiveFields(user),
        tokens: {
          accessToken: '',
          refreshToken: '',
          expiresIn: 0,
        },
      };
    }

    // Update last seen
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastSeenAt: new Date(),
        isOnline: true,
        updatedAt: new Date(),
      },
    });

    // Generate tokens
    const tokens = await this.generateTokens(user);

    return {
      user: excludeSensitiveFields(user),
      tokens,
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<AuthTokens & { user: Omit<User, 'passwordHash' | 'twoFactorSecret'> }> {
    // Verify refresh token
    let payload: TokenPayload;
    try {
      payload = jwt.verify(refreshToken, config.jwt.refreshSecret) as TokenPayload;
    } catch {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Check if token is revoked
    const storedToken = await prisma.refreshToken.findFirst({
      where: {
        token: refreshToken,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!storedToken) {
      throw new UnauthorizedError('Refresh token is invalid or expired');
    }

    // Get user
    const user = (await prisma.user.findFirst({ where: { id: payload.userId } })) as unknown as User | null;

    if (!user || user.deletedAt) {
      throw new UnauthorizedError('User not found');
    }

    // Revoke old refresh token
    await prisma.refreshToken.updateMany({
      where: { token: refreshToken },
      data: { isRevoked: true },
    });

    // Generate new tokens and return with user data
    const tokens = await this.generateTokens(user);
    return {
      ...tokens,
      user: excludeSensitiveFields(user),
    };
  }

  /**
   * Logout - revoke refresh token
   */
  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      // Revoke specific token
      await prisma.refreshToken.updateMany({
        where: { userId, token: refreshToken },
        data: { isRevoked: true },
      });
    } else {
      // Revoke all tokens for user
      await prisma.refreshToken.updateMany({
        where: { userId },
        data: { isRevoked: true },
      });
    }

    // Update user status
    await prisma.user.update({
      where: { id: userId },
      data: { isOnline: false, updatedAt: new Date() },
    });

    // Clear user cache
    await cache.del(cacheKeys.user(userId));
  }

  /**
   * OAuth login/register
   */
  async oauthLogin(
    provider: OAuthProvider,
    providerAccountId: string,
    profile: {
      email: string;
      name?: string;
      avatar?: string;
      accessToken?: string;
      refreshToken?: string;
    }
  ): Promise<AuthResponse> {
    // Check feature flags for OAuth providers
    if (provider === 'GOOGLE' && !config.features.oauthGoogle) {
      throw new BadRequestError('Google OAuth is disabled (set ENABLE_OAUTH_GOOGLE=true)');
    }
    if (provider === 'GITHUB' && !config.features.oauthGithub) {
      throw new BadRequestError('GitHub OAuth is disabled (set ENABLE_OAUTH_GITHUB=true)');
    }

    // Check if OAuth account exists
    const oauthAccount = await prisma.oauthAccount.findFirst({
      where: {
        provider,
        providerAccountId,
      },
    });

    let user: User;

    if (oauthAccount) {
      // Update tokens
      await prisma.oauthAccount.update({
        where: { id: (oauthAccount as any).id ?? (oauthAccount as any)._id },
        data: {
          accessToken: profile.accessToken,
          refreshToken: profile.refreshToken,
          updatedAt: new Date(),
        },
      });
      user = (await prisma.user.findFirst({ where: { id: (oauthAccount as any).userId } })) as unknown as User | null;
      if (!user) {
        throw new NotFoundError('User linked to OAuth account not found');
      }
    } else {
      // Check if user with email exists
      const existingUser = (await prisma.user.findFirst({ where: { email: profile.email } })) as unknown as User | null;

      if (existingUser) {
        // Link OAuth to existing account
        await prisma.oauthAccount.create({
          data: {
            userId: existingUser.id,
            provider,
            providerAccountId,
            accessToken: profile.accessToken,
            refreshToken: profile.refreshToken,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
        user = existingUser;
      } else {
        // Create new user
        const username = await this.generateUniqueUsername(
          profile.name || profile.email.split('@')[0]
        );

        const newUser: User = {
          id: crypto.randomUUID(),
          email: profile.email,
          username,
          displayName: profile.name,
          avatar: profile.avatar,
          emailVerified: true,
          role: 'USER',
          isOnline: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          profile: {},
        };

        await prisma.user.create({ data: newUser });
        await prisma.oauthAccount.create({
          data: {
            userId: newUser.id,
            provider,
            providerAccountId,
            accessToken: profile.accessToken,
            refreshToken: profile.refreshToken,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });

        user = newUser;
        console.log('[OAuth] Created new user:', user.email, user.username, user.id);
      }
    }

    // Generate tokens
    const tokens = await this.generateTokens(user);

    return {
      user: excludeSensitiveFields(user),
      tokens,
    };
  }

  /**
   * Request password reset
   */
  async forgotPassword(email: string): Promise<void> {
    const user = (await prisma.user.findFirst({ where: { email } })) as unknown as User | null;

    // Always return success to prevent email enumeration
    if (!user) return;

    // Generate reset token
    const resetToken = await this.createVerificationToken(
      email,
      'PASSWORD_RESET'
    );

    // Send reset email
    await emailService.sendPasswordResetEmail(email, resetToken);
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        token,
        type: 'PASSWORD_RESET',
        expiresAt: { gt: new Date() },
      },
    });

    if (!verificationToken) {
      throw new BadRequestError('Invalid or expired reset token');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

    // Update password
    await prisma.user.update({
      where: { email: (verificationToken as any).email },
      data: { passwordHash, updatedAt: new Date() },
    });

    // Delete token
    await prisma.verificationToken.deleteMany({
      where: { token },
    });

    // Revoke all refresh tokens
    await prisma.refreshToken.updateMany({
      where: { userEmail: (verificationToken as any).email },
      data: { isRevoked: true },
    });
  }

  /**
   * Verify email
   */
  async verifyEmail(token: string): Promise<void> {
    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        token,
        type: 'EMAIL_VERIFICATION',
        expiresAt: { gt: new Date() },
      },
    });

    if (!verificationToken) {
      throw new BadRequestError('Invalid or expired verification token');
    }

    // Update user
    await prisma.user.update({
      where: { email: (verificationToken as any).email },
      data: { emailVerified: true, updatedAt: new Date() },
    });

    // Delete token
    await prisma.verificationToken.deleteMany({
      where: { token },
    });
  }

  /**
   * Change password (for authenticated users)
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = (await prisma.user.findFirst({ where: { id: userId } })) as unknown as User | null;

    if (!user || !user.passwordHash) {
      throw new NotFoundError('User not found');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.passwordHash
    );
    if (!isPasswordValid) {
      throw new BadRequestError('Current password is incorrect');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash, updatedAt: new Date() },
    });

    // Revoke all refresh tokens except current session
    await prisma.refreshToken.updateMany({
      where: { userId },
      data: { isRevoked: true },
    });
  }

  /**
   * Generate JWT tokens
   */
  private async generateTokens(user: User): Promise<AuthTokens> {
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role ?? 'USER',
    };

    // Generate access token
    const accessToken = jwt.sign(payload, config.jwt.secret, {
      expiresIn: this.ACCESS_TOKEN_EXPIRY,
    });

    // Generate refresh token
    const refreshToken = jwt.sign(payload, config.jwt.refreshSecret, {
      expiresIn: this.REFRESH_TOKEN_EXPIRY,
    });

    // Store refresh token in database
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        isRevoked: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        userEmail: user.email,
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15 minutes in seconds
    };
  }

  /**
   * Create verification token
   */
  private async createVerificationToken(
    email: string,
    type: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET'
  ): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    const expiry = type === 'EMAIL_VERIFICATION'
      ? this.VERIFICATION_TOKEN_EXPIRY
      : this.RESET_TOKEN_EXPIRY;

    // Delete existing tokens for this email and type
    await prisma.verificationToken.deleteMany({
      where: { email, type },
    });

    // Create new token
    await prisma.verificationToken.create({
      data: {
        email,
        token,
        type,
        expiresAt: new Date(Date.now() + expiry),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return token;
  }

  /**
   * Generate unique username
   */
  private async generateUniqueUsername(baseName: string): Promise<string> {
    const cleanName = baseName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 20);

    let username = cleanName;
    let counter = 0;

    while (true) {
      const exists = (await prisma.user.findFirst({ where: { username } })) as unknown as User | null;

      if (!exists) break;

      counter++;
      username = `${cleanName}${counter}`;
    }

    return username;
  }
}

export const authService = new AuthService();
