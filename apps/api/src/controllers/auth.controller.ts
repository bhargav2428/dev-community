// Authentication Controller
// Handles HTTP requests for authentication endpoints

import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import { sendSuccess, sendCreated } from '../utils/response.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import type { 
  RegisterInput, 
  LoginInput, 
  ForgotPasswordInput,
  ResetPasswordInput,
  ChangePasswordInput,
  VerifyEmailInput,
  RefreshTokenInput,
} from '../schemas/auth.schema.js';

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
