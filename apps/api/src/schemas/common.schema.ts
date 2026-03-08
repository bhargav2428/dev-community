// Common Schema Validations
// Shared Zod schemas used across multiple modules

import { z } from 'zod';

// MongoDB ObjectId validation (24-character hex string)
export const objectIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid ID format');

// Common pagination schema
export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

// Common sort schema
export const sortSchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// URL validation that allows empty string
export const optionalUrlSchema = z.string().url().optional().or(z.literal(''));

// Date range schema
export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
}).refine((data) => {
  if (data.startDate && data.endDate) {
    return new Date(data.startDate) <= new Date(data.endDate);
  }
  return true;
}, {
  message: 'Start date must be before or equal to end date',
});

// Report schema (for reporting content/users)
export const createReportSchema = z.object({
  targetType: z.enum(['USER', 'POST', 'COMMENT', 'PROJECT', 'IDEA', 'JOB', 'MESSAGE']),
  targetId: objectIdSchema,
  reason: z.enum([
    'SPAM',
    'HARASSMENT',
    'HATE_SPEECH',
    'VIOLENCE',
    'NUDITY',
    'FALSE_INFO',
    'SCAM',
    'IMPERSONATION',
    'COPYRIGHT',
    'OTHER'
  ]),
  description: z.string().max(1000).optional(),
  evidence: z.array(z.string().url()).max(5).optional(),
});

// Notification preferences schema
export const notificationPrefsSchema = z.object({
  email: z.object({
    marketing: z.boolean().default(false),
    social: z.boolean().default(true),
    updates: z.boolean().default(true),
    security: z.boolean().default(true),
  }).optional(),
  push: z.object({
    mentions: z.boolean().default(true),
    messages: z.boolean().default(true),
    follows: z.boolean().default(true),
    likes: z.boolean().default(true),
    comments: z.boolean().default(true),
    projectUpdates: z.boolean().default(true),
  }).optional(),
});

// Admin action schema
export const adminActionSchema = z.object({
  targetType: z.enum(['USER', 'POST', 'COMMENT', 'PROJECT', 'IDEA', 'JOB']),
  targetId: objectIdSchema,
  action: z.enum([
    'BAN',
    'UNBAN',
    'WARN',
    'DELETE',
    'RESTORE',
    'FEATURE',
    'UNFEATURE',
    'VERIFY',
    'UNVERIFY'
  ]),
  reason: z.string().max(1000),
  duration: z.number().positive().optional(), // For temporary bans, in days
  notifyUser: z.boolean().default(true),
});

// Type exports
export type ObjectId = z.infer<typeof objectIdSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type SortInput = z.infer<typeof sortSchema>;
export type DateRangeInput = z.infer<typeof dateRangeSchema>;
export type CreateReportInput = z.infer<typeof createReportSchema>;
export type NotificationPrefsInput = z.infer<typeof notificationPrefsSchema>;
export type AdminActionInput = z.infer<typeof adminActionSchema>;
