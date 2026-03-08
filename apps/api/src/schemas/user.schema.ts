// User Schema Validations
// Zod schemas for user-related requests

import { z } from 'zod';

// Import objectIdSchema from common schema instead of redefining
import { objectIdSchema } from './common.schema.js';

// Update profile schema
export const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  displayName: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).optional(),
  headline: z.string().max(200).optional(),
  location: z.string().max(100).optional(),
  website: z.string().url().optional().or(z.literal('')),
  githubUrl: z.string().url().optional().or(z.literal('')),
  linkedinUrl: z.string().url().optional().or(z.literal('')),
  twitterUrl: z.string().url().optional().or(z.literal('')),
  isAvailableForHire: z.boolean().optional(),
  isOpenToCollab: z.boolean().optional(),
  profileVisibility: z.enum(['PUBLIC', 'CONNECTIONS_ONLY', 'PRIVATE']).optional(),
});

// Extended profile schema
export const updateExtendedProfileSchema = z.object({
  yearsOfExperience: z.number().min(0).max(50).optional(),
  currentRole: z.string().max(100).optional(),
  company: z.string().max(100).optional(),
  timezone: z.string().max(50).optional(),
  preferredLanguage: z.string().max(10).optional(),
});

// Add skill schema
export const addSkillSchema = z.object({
  skillId: objectIdSchema.optional(),
  skillName: z.string().min(1).max(50).optional(),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']).default('INTERMEDIATE'),
  yearsOfExp: z.number().min(0).max(50).optional(),
  isPrimary: z.boolean().default(false),
}).refine((data) => data.skillId || data.skillName, {
  message: 'Either skillId or skillName is required',
});

// Add experience schema
export const addExperienceSchema = z.object({
  title: z.string().min(1).max(100),
  company: z.string().min(1).max(100),
  companyLogo: z.string().url().optional(),
  location: z.string().max(100).optional(),
  type: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'FREELANCE', 'INTERNSHIP']),
  description: z.string().max(2000).optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  isCurrent: z.boolean().default(false),
});

// Add education schema
export const addEducationSchema = z.object({
  institution: z.string().min(1).max(100),
  degree: z.string().min(1).max(100),
  field: z.string().max(100).optional(),
  logo: z.string().url().optional(),
  description: z.string().max(1000).optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  isCurrent: z.boolean().default(false),
});

// Follow user schema
export const followUserSchema = z.object({
  userId: objectIdSchema,
});

// Block user schema
export const blockUserSchema = z.object({
  userId: objectIdSchema,
  reason: z.string().max(500).optional(),
});

// Update avatar/cover image schema
export const updateUserImageSchema = z.object({
  imageUrl: z.string().url(),
  type: z.enum(['avatar', 'cover']),
});

// Update notification preferences schema
export const updateNotificationPrefsSchema = z.object({
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  mentionNotifications: z.boolean().optional(),
  followNotifications: z.boolean().optional(),
  messageNotifications: z.boolean().optional(),
  projectNotifications: z.boolean().optional(),
});

// Search users schema
export const searchUsersSchema = z.object({
  query: z.string().min(1).max(100).optional(),
  skills: z.array(z.string()).optional(),
  isAvailableForHire: z.coerce.boolean().optional(),
  location: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
});

// Type exports
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdateExtendedProfileInput = z.infer<typeof updateExtendedProfileSchema>;
export type AddSkillInput = z.infer<typeof addSkillSchema>;
export type AddExperienceInput = z.infer<typeof addExperienceSchema>;
export type AddEducationInput = z.infer<typeof addEducationSchema>;
export type FollowUserInput = z.infer<typeof followUserSchema>;
export type BlockUserInput = z.infer<typeof blockUserSchema>;
export type UpdateUserImageInput = z.infer<typeof updateUserImageSchema>;
export type UpdateNotificationPrefsInput = z.infer<typeof updateNotificationPrefsSchema>;
export type SearchUsersInput = z.infer<typeof searchUsersSchema>;
