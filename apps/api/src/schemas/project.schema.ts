// Project Schema Validations
// Zod schemas for project-related requests

import { z } from 'zod';

// Create project schema
export const createProjectSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  longDescription: z.string().max(5000).optional(),
  website: z.string().url().optional().or(z.literal('')),
  githubUrl: z.string().url().optional().or(z.literal('')),
  demoUrl: z.string().url().optional().or(z.literal('')),
  visibility: z.enum(['PUBLIC', 'PRIVATE', 'TEAM_ONLY']).default('PUBLIC'),
  stage: z.enum(['IDEA', 'MVP', 'BETA', 'LAUNCHED', 'SCALING']).default('IDEA'),
  isOpenSource: z.boolean().default(false),
  isRecruiting: z.boolean().default(false),
  maxTeamSize: z.number().min(1).max(100).optional(),
  skills: z.array(z.string().cuid()).max(20).optional(),
});

// Update project schema
export const updateProjectSchema = createProjectSchema.partial();

// Add team member schema
export const addTeamMemberSchema = z.object({
  userId: z.string().cuid(),
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']).default('MEMBER'),
  title: z.string().max(100).optional(),
});

// Update team member schema
export const updateTeamMemberSchema = z.object({
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']).optional(),
  title: z.string().max(100).optional(),
});

// Create task schema
export const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED']).default('TODO'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  assigneeId: z.string().cuid().optional(),
  dueDate: z.string().datetime().optional(),
  milestoneId: z.string().cuid().optional(),
  labels: z.array(z.string().max(50)).max(10).optional(),
});

// Update task schema
export const updateTaskSchema = createTaskSchema.partial();

// Create milestone schema
export const createMilestoneSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  dueDate: z.string().datetime().optional(),
});

// Update milestone schema
export const updateMilestoneSchema = createMilestoneSchema.partial();

// Create channel schema
export const createChannelSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  type: z.enum(['TEXT', 'ANNOUNCEMENT']).default('TEXT'),
  isPrivate: z.boolean().default(false),
});

// Send channel message schema
export const sendChannelMessageSchema = z.object({
  content: z.string().min(1).max(4000),
  attachments: z.array(z.object({
    type: z.string(),
    url: z.string().url(),
    name: z.string(),
  })).max(10).optional(),
});

// Project invitation schema
export const createInvitationSchema = z.object({
  email: z.string().email().optional(),
  userId: z.string().cuid().optional(),
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']).default('MEMBER'),
  message: z.string().max(500).optional(),
}).refine((data) => data.email || data.userId, {
  message: 'Either email or userId is required',
});

// Search projects schema
export const searchProjectsSchema = z.object({
  query: z.string().min(1).max(100).optional(),
  skills: z.array(z.string()).optional(),
  stage: z.enum(['IDEA', 'MVP', 'BETA', 'LAUNCHED', 'SCALING']).optional(),
  isRecruiting: z.coerce.boolean().optional(),
  isOpenSource: z.coerce.boolean().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
});

// Type exports
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type AddTeamMemberInput = z.infer<typeof addTeamMemberSchema>;
export type UpdateTeamMemberInput = z.infer<typeof updateTeamMemberSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type CreateMilestoneInput = z.infer<typeof createMilestoneSchema>;
export type UpdateMilestoneInput = z.infer<typeof updateMilestoneSchema>;
export type CreateChannelInput = z.infer<typeof createChannelSchema>;
export type SendChannelMessageInput = z.infer<typeof sendChannelMessageSchema>;
export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;
export type SearchProjectsInput = z.infer<typeof searchProjectsSchema>;
