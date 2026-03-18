// Validation Middleware
// Validates request body, query, and params using Zod schemas

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { BadRequestError } from '../utils/errors.js';

type RequestPart = 'body' | 'query' | 'params';

/**
 * Validate request data against a Zod schema
 */
export const validate = <T>(
  schema: ZodSchema<T>,
  part: RequestPart = 'body'
) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const data = req[part];
      const validated = await schema.parseAsync(data);
      
      // Replace request data with validated and transformed data
      req[part] = validated as typeof req[typeof part];
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details: Record<string, string[]> = {};
        
        error.errors.forEach((err) => {
          const path = err.path.join('.');
          if (!details[path]) {
            details[path] = [];
          }
          details[path].push(err.message);
        });

        next(new BadRequestError('Validation failed', { errors: details }));
      } else {
        next(error);
      }
    }
  };
};

/**
 * Validate multiple request parts
 */
export const validateMultiple = (schemas: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const errors: Record<string, Record<string, string[]>> = {};

      for (const [part, schema] of Object.entries(schemas)) {
        if (schema) {
          try {
            const validated = await schema.parseAsync(req[part as RequestPart]);
            req[part as RequestPart] = validated as typeof req[RequestPart];
          } catch (error) {
            if (error instanceof ZodError) {
              errors[part] = {};
              error.errors.forEach((err) => {
                const path = err.path.join('.');
                if (!errors[part][path]) {
                  errors[part][path] = [];
                }
                errors[part][path].push(err.message);
              });
            }
          }
        }
      }

      if (Object.keys(errors).length > 0) {
        next(new BadRequestError('Validation failed', { errors }));
      } else {
        next();
      }
    } catch (error) {
      next(error);
    }
  };
};
