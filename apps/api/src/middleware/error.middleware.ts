// Error Handling Middleware
// Global error handler for the API

import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
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

  // Handle Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return handlePrismaError(error, res);
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return sendError(res, 'VALIDATION_ERROR', 'Invalid data provided', 400);
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
 * Handle Prisma-specific errors
 */
const handlePrismaError = (
  error: Prisma.PrismaClientKnownRequestError,
  res: Response
): Response => {
  switch (error.code) {
    // Unique constraint violation
    case 'P2002': {
      const target = (error.meta?.target as string[]) || [];
      const field = target[0] || 'field';
      return sendError(
        res,
        'CONFLICT',
        `A record with this ${field} already exists`,
        409
      );
    }
    
    // Record not found
    case 'P2025':
      return sendError(res, 'NOT_FOUND', 'Record not found', 404);
    
    // Foreign key constraint failed
    case 'P2003':
      return sendError(
        res,
        'BAD_REQUEST',
        'Related record does not exist',
        400
      );
    
    // Record to update not found
    case 'P2001':
      return sendError(res, 'NOT_FOUND', 'Record to update not found', 404);
    
    default:
      return sendError(
        res,
        'DATABASE_ERROR',
        'A database error occurred',
        500
      );
  }
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
