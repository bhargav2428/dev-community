// Error Handling Middleware
// Global error handler for the API

import { Request, Response, NextFunction } from 'express';
import { AppError, isAppError } from '../utils/errors.js';
import { sendError } from '../utils/response.js';
import { logger } from '../lib/logger.js';
import { config } from '../config/index.js';

/**
 * Global error handler
 */
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): Response => {
  // Log error
  logger.error('Error occurred:', {
    message: error.message,
    stack: config.isDevelopment ? error.stack : undefined,
    path: req.path,
    method: req.method,
    userId: req.user?.id,
  });

  // Handle AppError (operational errors)
  if (isAppError(error)) {
    return sendError(
      res,
      error.code,
      error.message,
      error.statusCode,
      config.isDevelopment ? error.details : undefined
    );
  }

  // Handle database errors (MongoDB)
  const anyError = error as any;
  if (anyError.code === 11000) {
    // Duplicate key error
    const field = Object.keys(anyError.keyPattern || {})[0] || 'field';
    return sendError(
      res,
      'CONFLICT',
      `A record with this ${field} already exists`,
      409
    );
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    return sendError(res, 'UNAUTHORIZED', 'Invalid token', 401);
  }

  if (error.name === 'TokenExpiredError') {
    return sendError(res, 'TOKEN_EXPIRED', 'Token has expired', 401);
  }

  // Default to 500 Internal Server Error
  return sendError(
    res,
    'INTERNAL_ERROR',
    config.isProduction ? 'An unexpected error occurred' : error.message,
    500
  );
};


/**
 * 404 Not Found handler
 */
export const notFoundHandler = (
  req: Request,
  res: Response
): Response => {
  return sendError(
    res,
    'NOT_FOUND',
    `Route ${req.method} ${req.path} not found`,
    404
  );
};

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
