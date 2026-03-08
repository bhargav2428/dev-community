// Messaging Schema Validations
// Zod schemas for messaging-related requests

import { z } from 'zod';

// MongoDB ObjectId validation (24-character hex string)
const objectIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid ID format');

// Send direct message schema
export const sendMessageSchema = z.object({
  content: z.string().min(1).max(5000),
  attachments: z.array(z.object({
    type: z.enum(['IMAGE', 'FILE', 'VIDEO', 'AUDIO']),
    url: z.string().url(),
    name: z.string().max(255),
    size: z.number().positive().optional(),
    mimeType: z.string().max(100).optional(),
  })).max(10).optional(),
  replyToId: objectIdSchema.optional(),
});

// Create conversation schema
export const createConversationSchema = z.object({
  type: z.enum(['DIRECT', 'GROUP']).default('DIRECT'),
  participantIds: z.array(objectIdSchema).min(1).max(50),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  avatar: z.string().url().optional(),
});

// Update conversation schema
export const updateConversationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  avatar: z.string().url().optional(),
  isMuted: z.boolean().optional(),
  isPinned: z.boolean().optional(),
});

// Add participants schema
export const addParticipantsSchema = z.object({
  userIds: z.array(objectIdSchema).min(1).max(50),
});

// Remove participant schema
export const removeParticipantSchema = z.object({
  userId: objectIdSchema,
});

// Update message schema
export const updateMessageSchema = z.object({
  content: z.string().min(1).max(5000),
});

// Add reaction schema
export const addReactionSchema = z.object({
  emoji: z.string().min(1).max(10),
});

// Get messages schema
export const getMessagesSchema = z.object({
  before: z.string().datetime().optional(),
  after: z.string().datetime().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
});

// Get conversations schema
export const getConversationsSchema = z.object({
  type: z.enum(['DIRECT', 'GROUP', 'ALL']).default('ALL'),
  unreadOnly: z.coerce.boolean().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
});

// Search messages schema
export const searchMessagesSchema = z.object({
  query: z.string().min(1).max(100),
  conversationId: objectIdSchema.optional(),
  fromUserId: objectIdSchema.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  hasAttachments: z.coerce.boolean().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
});

// Type exports
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type UpdateConversationInput = z.infer<typeof updateConversationSchema>;
export type AddParticipantsInput = z.infer<typeof addParticipantsSchema>;
export type RemoveParticipantInput = z.infer<typeof removeParticipantSchema>;
export type UpdateMessageInput = z.infer<typeof updateMessageSchema>;
export type AddReactionInput = z.infer<typeof addReactionSchema>;
export type GetMessagesInput = z.infer<typeof getMessagesSchema>;
export type GetConversationsInput = z.infer<typeof getConversationsSchema>;
export type SearchMessagesInput = z.infer<typeof searchMessagesSchema>;
