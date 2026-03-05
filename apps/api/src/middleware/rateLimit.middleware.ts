// Rate Limiting Middleware
// Protect API from abuse with configurable rate limits

import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { config } from '../config/index.js';
import { sendError } from '../utils/response.js';

// Standard rate limiter options
const standardOptions = {
  windowMs: config.rateLimit.windowMs, // 15 minutes
  max: config.rateLimit.maxRequests, // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    sendError(
      res,
      'TOO_MANY_REQUESTS',
      'Too many requests, please try again later',
      429
    );
  },
  keyGenerator: (req: Request) => {
    // Use user ID if authenticated, otherwise IP
    return req.user?.id || req.ip || 'anonymous';
  },
};

/**
 * Standard rate limiter for most endpoints
 */
export const standardLimiter = rateLimit(standardOptions);

/**
 * Strict rate limiter for sensitive endpoints (auth, etc.)
 */
export const strictLimiter = rateLimit({
  ...standardOptions,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  handler: (req: Request, res: Response) => {
    sendError(
      res,
      'TOO_MANY_REQUESTS',
      'Too many attempts, please try again in 15 minutes',
      429
    );
  },
});

/**
 * Auth rate limiter for login/register endpoints
 */
export const authLimiter = rateLimit({
  ...standardOptions,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 attempts per hour
  handler: (req: Request, res: Response) => {
    sendError(
      res,
      'TOO_MANY_REQUESTS',
      'Too many authentication attempts, please try again later',
      429
    );
  },
  keyGenerator: (req: Request) => {
    // Use IP for auth endpoints
    return req.ip || 'anonymous';
  },
});

/**
 * Uploads rate limiter
 */
export const uploadLimiter = rateLimit({
  ...standardOptions,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 uploads per hour
  handler: (req: Request, res: Response) => {
    sendError(
      res,
      'TOO_MANY_REQUESTS',
      'Upload limit reached, please try again later',
      429
    );
  },
});

/**
 * AI features rate limiter (expensive operations)
 */
export const aiLimiter = rateLimit({
  ...standardOptions,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 AI requests per hour
  handler: (req: Request, res: Response) => {
    sendError(
      res,
      'TOO_MANY_REQUESTS',
      'AI feature limit reached, please try again later',
      429
    );
  },
});

/**
 * Search rate limiter
 */
export const searchLimiter = rateLimit({
  ...standardOptions,
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 searches per minute
  handler: (req: Request, res: Response) => {
    sendError(
      res,
      'TOO_MANY_REQUESTS',
      'Search limit reached, please slow down',
      429
    );
  },
});
