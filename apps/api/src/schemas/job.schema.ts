// Job Schema Validations
// Zod schemas for job-related requests

import { z } from 'zod';

// MongoDB ObjectId validation (24-character hex string)
const objectIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid ID format');

// Salary range schema
const salaryRangeSchema = z.object({
  min: z.number().min(0),
  max: z.number().min(0),
  currency: z.string().length(3).default('USD'),
  period: z.enum(['HOURLY', 'MONTHLY', 'YEARLY']).default('YEARLY'),
}).refine((data) => data.max >= data.min, {
  message: 'Maximum salary must be greater than or equal to minimum',
});

// Create job schema
export const createJobSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(50).max(10000),
  company: z.string().min(1).max(200),
  companyLogo: z.string().url().optional().or(z.literal('')),
  companyWebsite: z.string().url().optional().or(z.literal('')),
  location: z.string().max(200).optional(),
  type: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'FREELANCE', 'INTERNSHIP']),
  workMode: z.enum(['REMOTE', 'ONSITE', 'HYBRID']).default('REMOTE'),
  experienceLevel: z.enum(['ENTRY', 'MID', 'SENIOR', 'LEAD', 'EXECUTIVE']),
  salary: salaryRangeSchema.optional(),
  skills: z.array(objectIdSchema).max(20).optional(),
  benefits: z.array(z.string().max(100)).max(20).optional(),
  requirements: z.array(z.string().max(500)).max(20).optional(),
  responsibilities: z.array(z.string().max(500)).max(20).optional(),
  applicationUrl: z.string().url().optional(),
  applicationEmail: z.string().email().optional(),
  deadline: z.string().datetime().optional(),
  isUrgent: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
});

// Update job schema
export const updateJobSchema = createJobSchema.partial();

// Apply to job schema
export const applyToJobSchema = z.object({
  coverLetter: z.string().min(50).max(5000),
  resumeUrl: z.string().url().optional(),
  portfolioUrl: z.string().url().optional(),
  linkedinUrl: z.string().url().optional(),
  expectedSalary: z.number().positive().optional(),
  availableFrom: z.string().datetime().optional(),
  answers: z.array(z.object({
    questionId: z.string(),
    answer: z.string().max(2000),
  })).optional(),
});

// Update application status schema
export const updateApplicationStatusSchema = z.object({
  status: z.enum(['PENDING', 'REVIEWING', 'SHORTLISTED', 'INTERVIEW', 'OFFERED', 'HIRED', 'REJECTED', 'WITHDRAWN']),
  notes: z.string().max(1000).optional(),
});

// Search jobs schema
export const searchJobsSchema = z.object({
  query: z.string().max(100).optional(),
  type: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'FREELANCE', 'INTERNSHIP']).optional(),
  workMode: z.enum(['REMOTE', 'ONSITE', 'HYBRID']).optional(),
  experienceLevel: z.enum(['ENTRY', 'MID', 'SENIOR', 'LEAD', 'EXECUTIVE']).optional(),
  skills: z.array(z.string()).optional(),
  location: z.string().optional(),
  minSalary: z.coerce.number().optional(),
  maxSalary: z.coerce.number().optional(),
  postedAfter: z.string().datetime().optional(),
  isUrgent: z.coerce.boolean().optional(),
  sortBy: z.enum(['recent', 'salary', 'relevance']).default('recent'),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
});

// Type exports
export type CreateJobInput = z.infer<typeof createJobSchema>;
export type UpdateJobInput = z.infer<typeof updateJobSchema>;
export type ApplyToJobInput = z.infer<typeof applyToJobSchema>;
export type UpdateApplicationStatusInput = z.infer<typeof updateApplicationStatusSchema>;
export type SearchJobsInput = z.infer<typeof searchJobsSchema>;
