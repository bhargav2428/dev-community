// Hackathon Schema Validations
// Zod schemas for hackathon-related requests

import { z } from 'zod';

// MongoDB ObjectId validation (24-character hex string)
const objectIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid ID format');

// Prize schema
const prizeSchema = z.object({
  position: z.number().min(1),
  title: z.string().max(100),
  amount: z.number().min(0).optional(),
  currency: z.string().length(3).default('USD'),
  description: z.string().max(500).optional(),
});

// Create hackathon schema
export const createHackathonSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(50).max(5000),
  longDescription: z.string().max(20000).optional(),
  coverImage: z.string().url().optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  registrationDeadline: z.string().datetime().optional(),
  timezone: z.string().max(50).default('UTC'),
  mode: z.enum(['ONLINE', 'IN_PERSON', 'HYBRID']).default('ONLINE'),
  location: z.string().max(200).optional(),
  maxParticipants: z.number().min(1).max(10000).optional(),
  minTeamSize: z.number().min(1).default(1),
  maxTeamSize: z.number().min(1).default(5),
  prizes: z.array(prizeSchema).max(10).optional(),
  tracks: z.array(z.string().max(100)).max(10).optional(),
  sponsors: z.array(z.object({
    name: z.string().max(100),
    logo: z.string().url().optional(),
    website: z.string().url().optional(),
    tier: z.enum(['PLATINUM', 'GOLD', 'SILVER', 'BRONZE']).optional(),
  })).max(20).optional(),
  judges: z.array(z.object({
    name: z.string().max(100),
    title: z.string().max(100).optional(),
    avatar: z.string().url().optional(),
    bio: z.string().max(500).optional(),
  })).max(20).optional(),
  rules: z.string().max(10000).optional(),
  faqs: z.array(z.object({
    question: z.string().max(500),
    answer: z.string().max(2000),
  })).max(30).optional(),
  skills: z.array(objectIdSchema).max(20).optional(),
  requirements: z.array(z.string().max(500)).max(10).optional(),
  isPublished: z.boolean().default(false),
});

// Update hackathon schema
export const updateHackathonSchema = createHackathonSchema.partial();

// Register for hackathon schema
export const registerForHackathonSchema = z.object({
  teamName: z.string().min(2).max(100).optional(),
  projectIdea: z.string().max(1000).optional(),
  track: z.string().max(100).optional(),
  dietaryRestrictions: z.string().max(200).optional(),
  tshirtSize: z.enum(['XS', 'S', 'M', 'L', 'XL', 'XXL']).optional(),
  emergencyContact: z.object({
    name: z.string().max(100),
    phone: z.string().max(20),
    relationship: z.string().max(50),
  }).optional(),
});

// Invite team member schema
export const inviteHackathonTeamMemberSchema = z.object({
  userId: objectIdSchema.optional(),
  email: z.string().email().optional(),
  message: z.string().max(500).optional(),
}).refine((data) => data.userId || data.email, {
  message: 'Either userId or email is required',
});

// Submit project schema
export const submitHackathonProjectSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().min(50).max(2000),
  demoUrl: z.string().url().optional(),
  repoUrl: z.string().url().optional(),
  videoUrl: z.string().url().optional(),
  slidesUrl: z.string().url().optional(),
  screenshots: z.array(z.string().url()).max(5).optional(),
  techStack: z.array(z.string().max(50)).max(15).optional(),
  track: z.string().max(100).optional(),
});

// Search hackathons schema
export const searchHackathonsSchema = z.object({
  query: z.string().max(100).optional(),
  mode: z.enum(['ONLINE', 'IN_PERSON', 'HYBRID']).optional(),
  status: z.enum(['UPCOMING', 'ONGOING', 'ENDED']).optional(),
  skills: z.array(z.string()).optional(),
  hasAvailableSpots: z.coerce.boolean().optional(),
  startAfter: z.string().datetime().optional(),
  startBefore: z.string().datetime().optional(),
  sortBy: z.enum(['recent', 'startDate', 'participants', 'prize']).default('startDate'),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
});

// Type exports
export type CreateHackathonInput = z.infer<typeof createHackathonSchema>;
export type UpdateHackathonInput = z.infer<typeof updateHackathonSchema>;
export type RegisterForHackathonInput = z.infer<typeof registerForHackathonSchema>;
export type InviteHackathonTeamMemberInput = z.infer<typeof inviteHackathonTeamMemberSchema>;
export type SubmitHackathonProjectInput = z.infer<typeof submitHackathonProjectSchema>;
export type SearchHackathonsInput = z.infer<typeof searchHackathonsSchema>;
