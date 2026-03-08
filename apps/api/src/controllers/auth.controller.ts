// Authentication Controller
// Handles HTTP requests for authentication endpoints

import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import { sendSuccess, sendCreated } from '../utils/response.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import { BadRequestError } from '../utils/errors.js';
import type { 
  RegisterInput, 
  LoginInput, 
  ForgotPasswordInput,
  ResetPasswordInput,
  ChangePasswordInput,
  VerifyEmailInput,
  RefreshTokenInput,
  OAuthLoginInput,
} from '../schemas/auth.schema.js';
import type { OAuthProvider } from '@prisma/client';

interface VerifiedOAuthProfile {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
}

const verifyGoogleAccessToken = async (accessToken: string): Promise<VerifiedOAuthProfile> => {
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new BadRequestError('Invalid Google access token');
  }

  const profile = await response.json() as {
    sub?: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    picture?: string;
  };

  if (!profile.sub || !profile.email) {
    throw new BadRequestError('Google profile missing required fields');
  }

  if (profile.email_verified === false) {
    throw new BadRequestError('Google account email is not verified');
  }

  return {
    id: profile.sub,
    email: profile.email.toLowerCase(),
    name: profile.name,
    avatar: profile.picture,
  };
};

const verifyGithubAccessToken = async (accessToken: string): Promise<VerifiedOAuthProfile> => {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'devcommunity-api',
  };

  const userResponse = await fetch('https://api.github.com/user', { headers });
  if (!userResponse.ok) {
    throw new BadRequestError('Invalid GitHub access token');
  }

  const userProfile = await userResponse.json() as {
    id?: number;
    email?: string | null;
    name?: string | null;
    avatar_url?: string | null;
    login?: string | null;
  };

  if (!userProfile.id) {
    throw new BadRequestError('GitHub profile missing required fields');
  }

  let email = userProfile.email || undefined;
  if (!email) {
    const emailsResponse = await fetch('https://api.github.com/user/emails', { headers });
    if (emailsResponse.ok) {
      const emails = await emailsResponse.json() as Array<{
        email: string;
        primary: boolean;
        verified: boolean;
      }>;
      const primaryEmail = emails.find((item) => item.primary && item.verified)
        || emails.find((item) => item.verified);
      email = primaryEmail?.email;
    }
  }

  if (!email) {
    throw new BadRequestError('GitHub account email is required');
  }

  return {
    id: String(userProfile.id),
    email: email.toLowerCase(),
    name: userProfile.name || userProfile.login || undefined,
    avatar: userProfile.avatar_url || undefined,
  };
};

/**
 * Register new user
 * POST /api/auth/register
 */
export const register = asyncHandler(
  async (req: Request<object, object, RegisterInput>, res: Response) => {
    const result = await authService.register(req.body);
    
    // Set refresh token as HTTP-only cookie
    res.cookie('refreshToken', result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    sendCreated(res, {
      user: result.user,
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
      expiresIn: result.tokens.expiresIn,
    }, 'Registration successful');
  }
);

/**
 * Login user
 * POST /api/auth/login
 */
export const login = asyncHandler(
  async (req: Request<object, object, LoginInput>, res: Response) => {
    const result = await authService.login(req.body);

    // Check if 2FA is required
    if (result.tokens.accessToken === '') {
      return sendSuccess(res, {
        requires2FA: true,
        userId: result.user.id,
      }, '2FA verification required');
    }

    // Set refresh token as HTTP-only cookie
    res.cookie('refreshToken', result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return sendSuccess(res, {
      user: result.user,
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
      expiresIn: result.tokens.expiresIn,
    }, 'Login successful');
  }
);

/**
 * OAuth login/register
 * POST /api/auth/oauth/:provider
 */
export const oauthLogin = asyncHandler(
  async (req: Request, res: Response) => {
    const body = req.body as OAuthLoginInput;
    const providerParam = req.params.provider?.toLowerCase();
    const providerMap: Record<string, OAuthProvider> = {
      google: 'GOOGLE',
      github: 'GITHUB',
    };

    const provider = providerMap[providerParam];
    if (!provider) {
      throw new BadRequestError('Unsupported OAuth provider');
    }

    const verifiedProfile = provider === 'GOOGLE'
      ? await verifyGoogleAccessToken(body.accessToken)
      : await verifyGithubAccessToken(body.accessToken);

    const result = await authService.oauthLogin(
      provider,
      verifiedProfile.id,
      {
        email: verifiedProfile.email,
        name: verifiedProfile.name,
        avatar: verifiedProfile.avatar,
        accessToken: body.accessToken,
        refreshToken: body.refreshToken,
      }
    );

    res.cookie('refreshToken', result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    sendSuccess(res, {
      user: result.user,
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
      expiresIn: result.tokens.expiresIn,
    }, 'OAuth login successful');
  }
);

/**
 * Logout user
 * POST /api/auth/logout
 */
export const logout = asyncHandler(
  async (req: Request, res: Response) => {
    const refreshToken = req.cookies.refreshToken;
    
    if (req.user) {
      await authService.logout(req.user.id, refreshToken);
    }

    // Clear refresh token cookie
    res.clearCookie('refreshToken');

    sendSuccess(res, null, 'Logged out successfully');
  }
);

/**
 * Refresh access token
 * POST /api/auth/refresh
 */
export const refreshToken = asyncHandler(
  async (req: Request<object, object, RefreshTokenInput>, res: Response) => {
    const token = req.body.refreshToken || req.cookies.refreshToken;
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Refresh token is required' }
      });
    }
    
    const result = await authService.refreshToken(token);

    // Update refresh token cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    sendSuccess(res, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn,
      user: result.user,
    });
  }
);

/**
 * Request password reset
 * POST /api/auth/forgot-password
 */
export const forgotPassword = asyncHandler(
  async (req: Request<object, object, ForgotPasswordInput>, res: Response) => {
    await authService.forgotPassword(req.body.email);
    
    // Always return success to prevent email enumeration
    sendSuccess(res, null, 'If an account exists, a reset link has been sent');
  }
);

/**
 * Reset password with token
 * POST /api/auth/reset-password
 */
export const resetPassword = asyncHandler(
  async (req: Request<object, object, ResetPasswordInput>, res: Response) => {
    await authService.resetPassword(req.body.token, req.body.password);
    sendSuccess(res, null, 'Password reset successful');
  }
);

/**
 * Verify email
 * POST /api/auth/verify-email
 */
export const verifyEmail = asyncHandler(
  async (req: Request<object, object, VerifyEmailInput>, res: Response) => {
    await authService.verifyEmail(req.body.token);
    sendSuccess(res, null, 'Email verified successfully');
  }
);

/**
 * Change password (authenticated)
 * POST /api/auth/change-password
 */
export const changePassword = asyncHandler(
  async (req: Request<object, object, ChangePasswordInput>, res: Response) => {
    await authService.changePassword(
      req.user!.id,
      req.body.currentPassword,
      req.body.newPassword
    );
    sendSuccess(res, null, 'Password changed successfully');
  }
);

/**
 * Get current user
 * GET /api/auth/me
 */
export const getCurrentUser = asyncHandler(
  async (req: Request, res: Response) => {
    sendSuccess(res, { user: req.user });
  }
);
