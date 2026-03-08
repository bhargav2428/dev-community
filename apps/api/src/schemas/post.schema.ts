// Post Schema Validations
// Zod schemas for post-related requests

import { z } from 'zod';

// MongoDB ObjectId validation (24-character hex string)
const objectIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid ID format');

// Create post schema
export const createPostSchema = z.object({
  content: z.string().min(1).max(5000),
  type: z.enum([
    'TEXT', 'IMAGE', 'VIDEO', 'LINK', 'PROJECT_LAUNCH', 
    'ACHIEVEMENT', 'HIRING', 'IDEA', 'BLOG'
  ]).default('TEXT'),
  images: z.array(z.string().url()).max(4).optional(),
  video: z.string().url().optional(),
  projectId: objectIdSchema.optional(),
  visibility: z.enum(['PUBLIC', 'CONNECTIONS_ONLY', 'PRIVATE']).default('PUBLIC'),
  tags: z.array(z.string().min(1).max(30)).max(5).optional(),
});

// Update post schema
export const updatePostSchema = z.object({
  content: z.string().min(1).max(5000).optional(),
  visibility: z.enum(['PUBLIC', 'CONNECTIONS_ONLY', 'PRIVATE']).optional(),
});

// Create comment schema
export const createCommentSchema = z.object({
  content: z.string().min(1).max(2000),
  parentId: objectIdSchema.optional(),
});

// Update comment schema
export const updateCommentSchema = z.object({
  content: z.string().min(1).max(2000),
});

// Get feed schema
export const getFeedSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
  filter: z.enum(['all', 'following', 'trending', 'recent']).default('all'),
  type: z.enum([
    'TEXT', 'IMAGE', 'VIDEO', 'LINK', 'PROJECT_LAUNCH', 
    'ACHIEVEMENT', 'HIRING', 'IDEA', 'BLOG'
  ]).optional(),
});

// Get post comments schema
export const getCommentsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
});

// Type exports
export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
export type GetFeedInput = z.infer<typeof getFeedSchema>;
export type GetCommentsInput = z.infer<typeof getCommentsSchema>;
