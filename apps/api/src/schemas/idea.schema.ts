// Startup Idea Schema Validations
// Zod schemas for idea-related requests

import { z } from 'zod';

// MongoDB ObjectId validation (24-character hex string)
const objectIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid ID format');

// Create idea schema
export const createIdeaSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(200),
  problem: z.string().min(20, 'Problem description must be at least 20 characters').max(2000),
  solution: z.string().min(20, 'Solution description must be at least 20 characters').max(2000),
  targetMarket: z.string().max(500).optional(),
  description: z.string().max(5000).optional(),
  businessModel: z.string().max(1000).optional(),
  competitors: z.string().max(1000).optional(),
  coverImage: z.string().url().optional().or(z.literal('')),
  pitchDeck: z.string().url().optional().or(z.literal('')),
  stage: z.enum(['CONCEPT', 'VALIDATION', 'BUILDING', 'LAUNCHED']).default('CONCEPT'),
  isLookingForCofounder: z.boolean().default(true),
  equity: z.string().max(100).optional(),
  investment: z.string().max(100).optional(),
  skills: z.array(objectIdSchema).max(10).optional(),
  roles: z.array(z.object({
    title: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    skills: z.array(z.string().max(50)).max(10).optional(),
  })).max(10).optional(),
});

// Update idea schema
export const updateIdeaSchema = createIdeaSchema.partial();

// Vote on idea schema
export const voteIdeaSchema = z.object({
  type: z.enum(['UP', 'DOWN']),
});

// Add team role schema
export const addIdeaRoleSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  skills: z.array(z.string().max(50)).max(10).optional(),
  isOpen: z.boolean().default(true),
});

// Apply to idea schema
export const applyToIdeaSchema = z.object({
  roleId: objectIdSchema.optional(),
  message: z.string().min(10).max(1000),
  portfolio: z.string().url().optional(),
});

// Search ideas schema
export const searchIdeasSchema = z.object({
  query: z.string().max(100).optional(),
  stage: z.enum(['CONCEPT', 'VALIDATION', 'BUILDING', 'LAUNCHED']).optional(),
  isLookingForCofounder: z.coerce.boolean().optional(),
  skills: z.array(z.string()).optional(),
  sortBy: z.enum(['recent', 'popular', 'votes']).default('recent'),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
});

// Type exports
export type CreateIdeaInput = z.infer<typeof createIdeaSchema>;
export type UpdateIdeaInput = z.infer<typeof updateIdeaSchema>;
export type VoteIdeaInput = z.infer<typeof voteIdeaSchema>;
export type AddIdeaRoleInput = z.infer<typeof addIdeaRoleSchema>;
export type ApplyToIdeaInput = z.infer<typeof applyToIdeaSchema>;
export type SearchIdeasInput = z.infer<typeof searchIdeasSchema>;
