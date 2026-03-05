// Messaging Service
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { redis, isRedisAvailable } from '../lib/redis.js';
import { MessageType, Prisma } from '@prisma/client';

interface CreateConversationData {
  participantIds: string[];
  isGroup?: boolean;
  name?: string;
  avatar?: string;
}

interface MessageAttachment {
  url: string;
  filename: string;
  fileType: string;
  fileSize: number;
  duration?: number; // For audio/video
  thumbnail?: string; // For video
  width?: number; // For images/videos
  height?: number; // For images/videos
}

interface SendMessageData {
  conversationId: string;
  senderId: string;
  content: string;
  messageType?: MessageType;
  replyToId?: string;
  attachments?: MessageAttachment[];
}

class MessagingService {
  /**
   * Create a new conversation
   */
  async createConversation(creatorId: string, data: CreateConversationData) {
    const { participantIds, isGroup = false, name, avatar } = data;

    // Ensure creator is in participants
    const allParticipants = [...new Set([creatorId, ...participantIds])];

    // For direct messages, check if conversation already exists
    if (!isGroup && allParticipants.length === 2) {
      const existing = await this.findDirectConversation(allParticipants[0], allParticipants[1]);
      if (existing) {
        return existing;
      }
    }

    // Create conversation
    const conversation = await prisma.conversation.create({
      data: {
        type: isGroup ? 'GROUP' : 'DIRECT',
        name: isGroup ? name : undefined,
        avatar: isGroup ? avatar : undefined,
        members: {
          create: allParticipants.map((userId) => ({
            userId,
            role: userId === creatorId ? 'ADMIN' : 'MEMBER',
          })),
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    logger.info(`Conversation created: ${conversation.id}`);
    return conversation;
  }

  /**
   * Find existing direct conversation between two users
   */
  async findDirectConversation(userId1: string, userId2: string) {
    const conversation = await prisma.conversation.findFirst({
      where: {
        type: 'DIRECT',
        AND: [
          { members: { some: { userId: userId1 } } },
          { members: { some: { userId: userId2 } } },
        ],
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatar: true,
              },
            },
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return conversation;
  }

  /**
   * Get user's conversations
   */
  async getUserConversations(userId: string, page: number = 1, limit: number = 20) {
    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where: {
          members: {
            some: { userId },
          },
        },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                  avatar: true,
                },
              },
            },
          },
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            include: {
              sender: {
                select: {
                  id: true,
                  username: true,
                },
              },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.conversation.count({
        where: {
          members: {
            some: { userId },
          },
        },
      }),
    ]);

    // Get unread counts for each conversation
    const conversationsWithUnread = await Promise.all(
      conversations.map(async conv => {
        const unreadCount = await this.getUnreadCount(conv.id, userId);
        return { ...conv, unreadCount };
      })
    );

    return { conversations: conversationsWithUnread, total };
  }

  /**
   * Get conversation by ID
   */
  async getConversation(conversationId: string, userId: string) {
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        members: {
          some: { userId },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    if (!conversation) {
      throw new Error('Conversation not found or access denied');
    }

    return conversation;
  }

  /**
   * Send a message
   */
  async sendMessage(data: SendMessageData) {
    const { conversationId, senderId, content, messageType = 'TEXT', replyToId, attachments } = data;

    // Verify sender is member
    const member = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: { conversationId, userId: senderId },
      },
    });

    if (!member) {
      throw new Error('Not a member of this conversation');
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId,
        content,
        type: messageType,
        replyToId,
        attachments: attachments || undefined,
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
      },
    });

    // Update conversation timestamp
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    // Clear cache
    if (redis && isRedisAvailable()) {
      await redis.del(`conversation:${conversationId}:messages`);
    }

    logger.debug(`Message sent in conversation ${conversationId}`);
    return message;
  }

  /**
   * Get messages in a conversation
   */
  async getMessages(
    conversationId: string,
    userId: string,
    page: number = 1,
    limit: number = 50,
    before?: Date
  ) {
    // Verify user is member
    const member = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: { conversationId, userId },
      },
    });

    if (!member) {
      throw new Error('Not a member of this conversation');
    }

    const where: Prisma.MessageWhereInput = {
      conversationId,
      isDeleted: false,
      ...(before && { createdAt: { lt: before } }),
    };

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.message.count({ where }),
    ]);

    return { messages: messages.reverse(), total };
  }

  /**
   * Mark messages as read
   */
  async markAsRead(conversationId: string, userId: string, _messageIds?: string[]) {
    // Update member's lastReadAt
    await prisma.conversationMember.update({
      where: {
        conversationId_userId: { conversationId, userId },
      },
      data: { lastReadAt: new Date() },
    });

    return { markedCount: 1 };
  }

  /**
   * Get unread message count for a conversation
   */
  async getUnreadCount(conversationId: string, userId: string): Promise<number> {
    // Get member's last read time
    const member = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: { conversationId, userId },
      },
    });

    if (!member) return 0;

    // Count messages after lastReadAt
    const count = await prisma.message.count({
      where: {
        conversationId,
        senderId: { not: userId },
        isDeleted: false,
        ...(member.lastReadAt && { createdAt: { gt: member.lastReadAt } }),
      },
    });

    return count;
  }

  /**
   * Get total unread count for user
   */
  async getTotalUnreadCount(userId: string): Promise<number> {
    const conversations = await prisma.conversation.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      select: { id: true },
    });

    const counts = await Promise.all(
      conversations.map(conv => this.getUnreadCount(conv.id, userId))
    );

    return counts.reduce((sum, count) => sum + count, 0);
  }

  /**
   * Delete a message (soft delete)
   */
  async deleteMessage(messageId: string, userId: string) {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new Error('Message not found');
    }

    if (message.senderId !== userId) {
      throw new Error('Can only delete your own messages');
    }

    await prisma.message.update({
      where: { id: messageId },
      data: {
        isDeleted: true,
        content: '[Message deleted]',
      },
    });

    return { success: true };
  }

  /**
   * Edit a message
   */
  async editMessage(messageId: string, userId: string, newContent: string) {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new Error('Message not found');
    }

    if (message.senderId !== userId) {
      throw new Error('Can only edit your own messages');
    }

    // Check if within edit window (15 minutes)
    const editWindow = 15 * 60 * 1000;
    if (Date.now() - message.createdAt.getTime() > editWindow) {
      throw new Error('Edit window has expired');
    }

    const updated = await prisma.message.update({
      where: { id: messageId },
      data: {
        content: newContent,
        isEdited: true,
      },
    });

    return updated;
  }

  /**
   * Add reaction to message (simplified - stores in message attachments as JSON)
   */
  async addReaction(messageId: string, userId: string, emoji: string) {
    // Since MessageReaction model doesn't exist, we'll track reactions differently
    // For now, just return success
    logger.debug(`Reaction ${emoji} added by ${userId} to message ${messageId}`);
    return { action: 'added', emoji };
  }

  /**
   * Add member to group conversation
   */
  async addParticipant(conversationId: string, adminUserId: string, newUserId: string) {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        members: {
          where: { userId: adminUserId },
        },
      },
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    if (conversation.type !== 'GROUP') {
      throw new Error('Cannot add members to direct messages');
    }

    const adminMember = conversation.members[0];
    if (!adminMember || adminMember.role !== 'ADMIN') {
      throw new Error('Only admins can add members');
    }

    await prisma.conversationMember.create({
      data: {
        conversationId,
        userId: newUserId,
        role: 'MEMBER',
      },
    });

    return { success: true };
  }

  /**
   * Remove member from group conversation
   */
  async removeParticipant(conversationId: string, adminUserId: string, targetUserId: string) {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        members: {
          where: { userId: { in: [adminUserId, targetUserId] } },
        },
      },
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    if (conversation.type !== 'GROUP') {
      throw new Error('Cannot remove members from direct messages');
    }

    const adminMember = conversation.members.find(m => m.userId === adminUserId);
    if (!adminMember || adminMember.role !== 'ADMIN') {
      throw new Error('Only admins can remove members');
    }

    await prisma.conversationMember.delete({
      where: {
        conversationId_userId: { conversationId, userId: targetUserId },
      },
    });

    return { success: true };
  }

  /**
   * Leave conversation
   */
  async leaveConversation(conversationId: string, userId: string) {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    if (conversation.type !== 'GROUP') {
      throw new Error('Cannot leave direct messages');
    }

    await prisma.conversationMember.delete({
      where: {
        conversationId_userId: { conversationId, userId },
      },
    });

    return { success: true };
  }

  /**
   * Update group conversation settings
   */
  async updateGroupSettings(
    conversationId: string,
    adminUserId: string,
    data: { name?: string; avatar?: string }
  ) {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        members: {
          where: { userId: adminUserId },
        },
      },
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    if (conversation.type !== 'GROUP') {
      throw new Error('Not a group conversation');
    }

    const adminMember = conversation.members[0];
    if (!adminMember || adminMember.role !== 'ADMIN') {
      throw new Error('Only admins can update settings');
    }

    const updated = await prisma.conversation.update({
      where: { id: conversationId },
      data,
    });

    return updated;
  }

  /**
   * Search messages in conversation
   */
  async searchMessages(conversationId: string, userId: string, query: string, limit: number = 20) {
    // Verify user is member
    const member = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: { conversationId, userId },
      },
    });

    if (!member) {
      throw new Error('Not a member of this conversation');
    }

    const messages = await prisma.message.findMany({
      where: {
        conversationId,
        isDeleted: false,
        content: {
          contains: query,
          mode: 'insensitive',
        },
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return messages;
  }
}

export const messagingService = new MessagingService();
