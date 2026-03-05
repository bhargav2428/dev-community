// WebSocket Server Configuration and Handlers
import { Server as SocketServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/index.js';
import { logger } from '../lib/logger.js';
import { redis, isRedisAvailable } from '../lib/redis.js';
import { prisma } from '../lib/prisma.js';

// Types
interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
}

interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

// Online users tracking
const onlineUsers = new Map<string, Set<string>>(); // userId -> Set of socket IDs

// Initialize WebSocket handlers
export const initializeWebSocket = (io: SocketServer) => {
  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token =
        socket.handshake.auth.token ||
        socket.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication required'));
      }

      // Verify JWT token
      const decoded = jwt.verify(token, env.JWT_SECRET) as JWTPayload;

      // Get user from database
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, username: true, deletedAt: true },
      });

      if (!user || user.deletedAt) {
        return next(new Error('User not found or inactive'));
      }

      // Attach user info to socket
      socket.userId = user.id;
      socket.username = user.username;

      next();
    } catch (error) {
      logger.error('Socket authentication error:', error);
      next(new Error('Invalid token'));
    }
  });

  // Connection handler
  io.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.userId!;
    const username = socket.username;

    logger.info(`User connected: ${username} (${userId}) - Socket: ${socket.id}`);

    // Track online user
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId)!.add(socket.id);

    // Update online status in Redis
    updateOnlineStatus(userId, true);

    // Join personal room for direct messages and notifications
    socket.join(`user:${userId}`);

    // Broadcast online status to followers
    broadcastOnlineStatus(io, userId, true);

    // ==================
    // MESSAGING EVENTS
    // ==================

    // Join conversation room
    socket.on('join:conversation', async (conversationId: string) => {
      try {
        // Verify user is participant
        const participant = await prisma.conversationMember.findUnique({
          where: {
            conversationId_userId: { conversationId, userId },
          },
        });

        if (participant) {
          socket.join(`conversation:${conversationId}`);
          logger.debug(`User ${userId} joined conversation ${conversationId}`);
        }
      } catch (error) {
        logger.error('Error joining conversation:', error);
        socket.emit('error', { message: 'Failed to join conversation' });
      }
    });

    // Leave conversation room
    socket.on('leave:conversation', (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`);
      logger.debug(`User ${userId} left conversation ${conversationId}`);
    });

    // Send message
    socket.on('message:send', async (data: {
      conversationId: string;
      content: string;
      messageType?: string;
    }) => {
      try {
        const { conversationId, content, messageType = 'TEXT' } = data;

        // Verify participation
        const participant = await prisma.conversationMember.findUnique({
          where: {
            conversationId_userId: { conversationId, userId },
          },
        });

        if (!participant) {
          socket.emit('error', { message: 'Not a participant of this conversation' });
          return;
        }

        // Create message
        const message = await prisma.message.create({
          data: {
            conversationId,
            senderId: userId,
            content,
            type: messageType as any,
          },
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                avatar: true,
              },
            },
          },
        });

        // Update conversation timestamp
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        });

        // Broadcast message to conversation room
        io.to(`conversation:${conversationId}`).emit('message:new', message);

        // Send notification to other participants
        const participants = await prisma.conversationMember.findMany({
          where: {
            conversationId,
            userId: { not: userId },
          },
        });

        for (const p of participants) {
          io.to(`user:${p.userId}`).emit('notification:message', {
            conversationId,
            message: {
              id: message.id,
              content: content.substring(0, 100),
              senderId: message.senderId,
            },
          });
        }
      } catch (error) {
        logger.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Typing indicator
    socket.on('typing:start', (conversationId: string) => {
      socket.to(`conversation:${conversationId}`).emit('typing:user', {
        conversationId,
        userId,
        username,
        isTyping: true,
      });
    });

    socket.on('typing:stop', (conversationId: string) => {
      socket.to(`conversation:${conversationId}`).emit('typing:user', {
        conversationId,
        userId,
        username,
        isTyping: false,
      });
    });

    // Mark messages as read
    socket.on('message:read', async (data: { conversationId: string; messageId: string }) => {
      try {
        const { conversationId, messageId } = data;

        // Update lastReadAt on ConversationMember
        await prisma.conversationMember.updateMany({
          where: {
            conversationId,
            userId,
          },
          data: { lastReadAt: new Date() },
        });

        // Notify sender
        const message = await prisma.message.findUnique({
          where: { id: messageId },
          select: { senderId: true },
        });

        if (message) {
          io.to(`user:${message.senderId}`).emit('message:seen', {
            messageId,
            conversationId,
            seenBy: userId,
          });
        }
      } catch (error) {
        logger.error('Error marking message as read:', error);
      }
    });

    // ==================
    // NOTIFICATION EVENTS
    // ==================

    // Get unread notification count
    socket.on('notifications:count', async () => {
      try {
        const count = await prisma.notification.count({
          where: { userId, isRead: false },
        });
        socket.emit('notifications:count', count);
      } catch (error) {
        logger.error('Error getting notification count:', error);
      }
    });

    // Mark notification as read
    socket.on('notification:read', async (notificationId: string) => {
      try {
        await prisma.notification.update({
          where: { id: notificationId },
          data: { isRead: true, readAt: new Date() },
        });
        socket.emit('notification:updated', { id: notificationId, isRead: true });
      } catch (error) {
        logger.error('Error marking notification as read:', error);
      }
    });

    // Mark all notifications as read
    socket.on('notifications:readAll', async () => {
      try {
        await prisma.notification.updateMany({
          where: { userId, isRead: false },
          data: { isRead: true, readAt: new Date() },
        });
        socket.emit('notifications:cleared');
      } catch (error) {
        logger.error('Error marking all notifications as read:', error);
      }
    });

    // ==================
    // PROJECT EVENTS
    // ==================

    // Join project room
    socket.on('join:project', async (projectId: string) => {
      try {
        const member = await prisma.projectMember.findUnique({
          where: {
            projectId_userId: { projectId, userId },
          },
        });

        if (member) {
          socket.join(`project:${projectId}`);
          logger.debug(`User ${userId} joined project ${projectId}`);
        }
      } catch (error) {
        logger.error('Error joining project:', error);
      }
    });

    // Leave project room
    socket.on('leave:project', (projectId: string) => {
      socket.leave(`project:${projectId}`);
    });

    // Task update notification
    socket.on('task:update', async (data: { projectId: string; taskId: string; update: any }) => {
      io.to(`project:${data.projectId}`).emit('task:updated', {
        taskId: data.taskId,
        update: data.update,
        updatedBy: { userId, username },
      });
    });

    // ==================
    // PRESENCE EVENTS
    // ==================

    // Get online status of users
    socket.on('presence:check', (userIds: string[]) => {
      const statuses = userIds.map(id => ({
        userId: id,
        online: onlineUsers.has(id) && onlineUsers.get(id)!.size > 0,
      }));
      socket.emit('presence:status', statuses);
    });

    // ==================
    // DISCONNECT HANDLER
    // ==================

    socket.on('disconnect', () => {
      logger.info(`User disconnected: ${username} (${userId}) - Socket: ${socket.id}`);

      // Remove socket from tracking
      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          // Update offline status
          updateOnlineStatus(userId, false);
          // Broadcast offline status
          broadcastOnlineStatus(io, userId, false);
        }
      }
    });
  });

  // Log connection stats periodically
  setInterval(() => {
    const totalConnections = io.engine.clientsCount;
    const uniqueUsers = onlineUsers.size;
    logger.info(`WebSocket Stats - Connections: ${totalConnections}, Unique Users: ${uniqueUsers}`);
  }, 60000); // Every minute
};

// Helper: Update online status in Redis
async function updateOnlineStatus(userId: string, online: boolean) {
  if (!redis || !isRedisAvailable()) return;
  try {
    const key = `presence:${userId}`;
    if (online) {
      await redis.set(key, Date.now().toString(), 'EX', 3600); // 1 hour TTL
    } else {
      await redis.del(key);
      // Store last seen
      await redis.set(`lastSeen:${userId}`, Date.now().toString(), 'EX', 86400 * 7); // 7 days
    }
  } catch (error) {
    logger.error('Error updating online status:', error);
  }
}

// Helper: Broadcast online status to followers
async function broadcastOnlineStatus(io: SocketServer, userId: string, online: boolean) {
  try {
    // Get user's followers
    const followers = await prisma.follow.findMany({
      where: { followingId: userId },
      select: { followerId: true },
    });

    // Emit to each follower's room
    for (const follower of followers) {
      io.to(`user:${follower.followerId}`).emit('presence:update', {
        userId,
        online,
        timestamp: Date.now(),
      });
    }
  } catch (error) {
    logger.error('Error broadcasting online status:', error);
  }
}

// Helper: Send notification via WebSocket
export async function sendNotification(
  io: SocketServer,
  userId: string,
  notification: {
    id: string;
    type: string;
    title: string;
    message: string;
    data?: any;
  }
) {
  io.to(`user:${userId}`).emit('notification:new', notification);
}

// Helper: Send project update
export async function sendProjectUpdate(
  io: SocketServer,
  projectId: string,
  update: {
    type: string;
    data: any;
    userId: string;
  }
) {
  io.to(`project:${projectId}`).emit('project:update', update);
}

// Export online users map for external access
export { onlineUsers };
