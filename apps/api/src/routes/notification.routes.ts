// Notification Routes
import { Router } from 'express';
import { notificationService } from '../services/notification.service.js';
import { sendSuccess, sendPaginated, sendNoContent } from '../utils/response.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { z } from 'zod';
import { validate } from '../middleware/validate.middleware.js';
import { NotificationType } from '@prisma/client';

const router = Router();

// All notification routes require authentication
router.use(authenticate);

// Get notifications
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, type, read } = req.query;
    
    const filters = {
      ...(type && { type: type as NotificationType }),
      ...(read !== undefined && { read: read === 'true' }),
    };

    const { notifications, total } = await notificationService.getUserNotifications(
      req.user!.id,
      Number(page),
      Number(limit),
      filters
    );

    sendPaginated(res, notifications, {
      page: Number(page),
      limit: Number(limit),
      total,
    });
  })
);

// Get unread count
router.get(
  '/unread-count',
  asyncHandler(async (req, res) => {
    const count = await notificationService.getUnreadCount(req.user!.id);
    sendSuccess(res, { unreadCount: count });
  })
);

// Mark single notification as read
router.patch(
  '/:id/read',
  asyncHandler(async (req, res) => {
    await notificationService.markAsRead(req.params.id, req.user!.id);
    sendSuccess(res, { message: 'Notification marked as read' });
  })
);

// Mark all notifications as read
router.post(
  '/read-all',
  asyncHandler(async (req, res) => {
    await notificationService.markAllAsRead(req.user!.id);
    sendSuccess(res, { message: 'All notifications marked as read' });
  })
);

// Delete a notification
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await notificationService.delete(req.params.id, req.user!.id);
    sendNoContent(res);
  })
);

export default router;
