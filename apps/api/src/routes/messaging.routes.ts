// Messaging Routes
import { Router } from 'express';
import { messagingService } from '../services/messaging.service.js';
import { sendSuccess, sendPaginated, sendCreated } from '../utils/response.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { z } from 'zod';

const router = Router();

// All messaging routes require authentication
router.use(authenticate);

// Validation schemas
const createConversationSchema = z.object({
  participantIds: z.array(z.string().cuid()).min(1).max(50),
  isGroup: z.boolean().optional().default(false),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional(),
});

const sendMessageSchema = z.object({
  content: z.string().max(5000).optional().default(''),
  messageType: z.enum(['TEXT', 'IMAGE', 'AUDIO', 'VIDEO', 'FILE', 'CODE', 'SYSTEM']).optional().default('TEXT'),
  replyToId: z.string().cuid().optional(),
  attachments: z.array(z.object({
    url: z.string().url(),
    filename: z.string(),
    fileType: z.string(),
    fileSize: z.number().max(100 * 1024 * 1024), // 100MB max
    duration: z.number().optional(), // For audio/video duration in seconds
    thumbnail: z.string().url().optional(), // For video thumbnails
    width: z.number().optional(), // For images/videos
    height: z.number().optional(), // For images/videos
  })).optional(),
});

const editMessageSchema = z.object({
  content: z.string().min(1).max(5000),
});

const updateGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional(),
});

// ==================
// CONVERSATION ROUTES
// ==================

// Get user's conversations
router.get(
  '/conversations',
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const { conversations, total } = await messagingService.getUserConversations(
      req.user!.id,
      Number(page),
      Number(limit)
    );
    sendPaginated(res, conversations, {
      page: Number(page),
      limit: Number(limit),
      total,
    });
  })
);

// Create a conversation
router.post(
  '/conversations',
  validate(createConversationSchema),
  asyncHandler(async (req, res) => {
    const conversation = await messagingService.createConversation(
      req.user!.id,
      req.body
    );
    sendCreated(res, conversation);
  })
);

// Get a specific conversation
router.get(
  '/conversations/:id',
  asyncHandler(async (req, res) => {
    const conversation = await messagingService.getConversation(
      req.params.id,
      req.user!.id
    );
    sendSuccess(res, conversation);
  })
);

// Find or create direct conversation
router.post(
  '/conversations/direct/:userId',
  asyncHandler(async (req, res) => {
    const conversation = await messagingService.createConversation(
      req.user!.id,
      {
        participantIds: [req.params.userId],
        isGroup: false,
      }
    );
    sendSuccess(res, conversation);
  })
);

// Get unread counts
router.get(
  '/unread',
  asyncHandler(async (req, res) => {
    const count = await messagingService.getTotalUnreadCount(req.user!.id);
    sendSuccess(res, { unreadCount: count });
  })
);

// ==================
// MESSAGE ROUTES
// ==================

// Get messages in a conversation
router.get(
  '/conversations/:conversationId/messages',
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 50, before } = req.query;
    const { messages, total } = await messagingService.getMessages(
      req.params.conversationId,
      req.user!.id,
      Number(page),
      Number(limit),
      before ? new Date(before as string) : undefined
    );
    sendPaginated(res, messages, {
      page: Number(page),
      limit: Number(limit),
      total,
    });
  })
);

// Send a message
router.post(
  '/conversations/:conversationId/messages',
  validate(sendMessageSchema),
  asyncHandler(async (req, res) => {
    const message = await messagingService.sendMessage({
      conversationId: req.params.conversationId,
      senderId: req.user!.id,
      ...req.body,
    });
    sendCreated(res, message);
  })
);

// Mark messages as read
router.post(
  '/conversations/:conversationId/read',
  asyncHandler(async (req, res) => {
    const { messageIds } = req.body;
    const result = await messagingService.markAsRead(
      req.params.conversationId,
      req.user!.id,
      messageIds
    );
    sendSuccess(res, result);
  })
);

// Search messages in conversation
router.get(
  '/conversations/:conversationId/search',
  asyncHandler(async (req, res) => {
    const { q, limit = 20 } = req.query;
    const messages = await messagingService.searchMessages(
      req.params.conversationId,
      req.user!.id,
      q as string,
      Number(limit)
    );
    sendSuccess(res, messages);
  })
);

// Edit a message
router.patch(
  '/messages/:messageId',
  validate(editMessageSchema),
  asyncHandler(async (req, res) => {
    const message = await messagingService.editMessage(
      req.params.messageId,
      req.user!.id,
      req.body.content
    );
    sendSuccess(res, message);
  })
);

// Delete a message
router.delete(
  '/messages/:messageId',
  asyncHandler(async (req, res) => {
    await messagingService.deleteMessage(req.params.messageId, req.user!.id);
    sendSuccess(res, { message: 'Message deleted' });
  })
);

// Add reaction to message
router.post(
  '/messages/:messageId/reactions',
  validate(z.object({ emoji: z.string().min(1).max(10) })),
  asyncHandler(async (req, res) => {
    const result = await messagingService.addReaction(
      req.params.messageId,
      req.user!.id,
      req.body.emoji
    );
    sendSuccess(res, result);
  })
);

// ==================
// GROUP MANAGEMENT ROUTES
// ==================

// Update group settings
router.patch(
  '/conversations/:conversationId/settings',
  validate(updateGroupSchema),
  asyncHandler(async (req, res) => {
    const conversation = await messagingService.updateGroupSettings(
      req.params.conversationId,
      req.user!.id,
      req.body
    );
    sendSuccess(res, conversation);
  })
);

// Add participant to group
router.post(
  '/conversations/:conversationId/participants',
  validate(z.object({ userId: z.string().cuid() })),
  asyncHandler(async (req, res) => {
    await messagingService.addParticipant(
      req.params.conversationId,
      req.user!.id,
      req.body.userId
    );
    sendSuccess(res, { message: 'Participant added' });
  })
);

// Remove participant from group
router.delete(
  '/conversations/:conversationId/participants/:userId',
  asyncHandler(async (req, res) => {
    await messagingService.removeParticipant(
      req.params.conversationId,
      req.user!.id,
      req.params.userId
    );
    sendSuccess(res, { message: 'Participant removed' });
  })
);

// Leave conversation
router.post(
  '/conversations/:conversationId/leave',
  asyncHandler(async (req, res) => {
    await messagingService.leaveConversation(
      req.params.conversationId,
      req.user!.id
    );
    sendSuccess(res, { message: 'Left conversation' });
  })
);

export default router;
