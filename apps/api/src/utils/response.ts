// API Response Utilities
// Standardized response format for all API endpoints

import { Response } from 'express';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

// Success response
export const sendSuccess = <T>(
  res: Response,
  data: T,
  message?: string,
  statusCode: number = 200,
  meta?: ApiResponse['meta']
): Response => {
  const response: ApiResponse<T> = {
    success: true,
    data,
    ...(message && { message }),
    ...(meta && { meta }),
  };

  return res.status(statusCode).json(response);
};

// Paginated response
export const sendPaginated = <T>(
  res: Response,
  data: T[],
  pagination: {
    page: number;
    limit: number;
    total: number;
  }
): Response => {
  const totalPages = Math.ceil(pagination.total / pagination.limit);

  return sendSuccess(res, data, undefined, 200, {
    page: pagination.page,
    limit: pagination.limit,
    total: pagination.total,
    totalPages,
  });
};

// Error response
export const sendError = (
  res: Response,
  code: string,
  message: string,
  statusCode: number = 500,
  details?: Record<string, unknown>
): Response => {
  const response: ApiResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
    },
  };

  return res.status(statusCode).json(response);
};

// Created response (201)
export const sendCreated = <T>(
  res: Response,
  data: T,
  message: string = 'Created successfully'
): Response => {
  return sendSuccess(res, data, message, 201);
};

// No content response (204)
export const sendNoContent = (res: Response): Response => {
  return res.status(204).send();
};
