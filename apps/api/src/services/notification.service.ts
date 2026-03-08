// Notification Service
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { NotificationType, Prisma } from '@prisma/client';

interface CreateNotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, any>;
  senderId?: string;
}

interface NotificationFilters {
  type?: NotificationType;
  read?: boolean;
}

class NotificationService {
  /**
   * Create a notification
   */
  async create(data: CreateNotificationData) {
    try {
      const notification = await prisma.notification.create({
        data: {
          user: { connect: { id: data.userId } },
          type: data.type,
          title: data.title,
          message: data.message,
          actionUrl: data.link,
          ...(data.senderId && { sender: { connect: { id: data.senderId } } }),
        },
      });

      // Enqueue notification job
      const { notificationQueue } = await import('./queue.js');
      await notificationQueue.add('send', {
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        link: data.link,
        senderId: data.senderId,
      });

      logger.info(`Notification created for user ${data.userId}: ${data.type}`);
      return notification;
    } catch (error) {
      logger.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Create multiple notifications
   */
  async createBulk(notifications: CreateNotificationData[]) {
    try {
      const result = await prisma.notification.createMany({
        data: notifications.map(n => ({
          userId: n.userId,
          type: n.type,
          title: n.title,
          message: n.message,
          actionUrl: n.link,
          senderId: n.senderId,
        })),
      });

      logger.info(`Created ${result.count} notifications`);
      return result;
    } catch (error) {
      logger.error('Error creating bulk notifications:', error);
      throw error;
    }
  }

  /**
   * Get notifications for a user
   */
  async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20,
    filters?: NotificationFilters
  ) {
    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(filters?.type && { type: filters.type }),
      ...(filters?.read !== undefined && { isRead: filters.read }),
    };

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notification.count({ where }),
    ]);

    return { notifications, total };
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string) {
    return prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  /**
   * Delete a notification
   */
  async delete(notificationId: string, userId: string) {
    return prisma.notification.deleteMany({
      where: { id: notificationId, userId },
    });
  }

  /**
   * Delete old notifications
   */
  async cleanupOldNotifications(daysOld: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await prisma.notification.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
        isRead: true,
      },
    });

    logger.info(`Cleaned up ${result.count} old notifications`);
    return result;
  }

  // ==================
  // Notification Helpers
  // ==================

  /**
   * Notify on new follower
   */
  async notifyNewFollower(followedUserId: string, followerUserId: string) {
    const follower = await prisma.user.findUnique({
      where: { id: followerUserId },
      select: { username: true },
    });

    return this.create({
      userId: followedUserId,
      senderId: followerUserId,
      type: 'FOLLOW',
      title: 'New Follower',
      message: `${follower?.username || 'Someone'} started following you`,
      link: `/profile/${follower?.username}`,
    });
  }

  /**
   * Notify on post like
   */
  async notifyPostLike(postAuthorId: string, likerUserId: string, postId: string) {
    if (postAuthorId === likerUserId) return; // Don't notify self

    const liker = await prisma.user.findUnique({
      where: { id: likerUserId },
      select: { username: true },
    });

    return this.create({
      userId: postAuthorId,
      senderId: likerUserId,
      type: 'LIKE',
      title: 'Post Liked',
      message: `${liker?.username || 'Someone'} liked your post`,
      link: `/posts/${postId}`,
      metadata: { postId },
    });
  }

  /**
   * Notify on comment
   */
  async notifyComment(
    postAuthorId: string,
    commenterId: string,
    postId: string,
    commentPreview: string
  ) {
    if (postAuthorId === commenterId) return; // Don't notify self

    const commenter = await prisma.user.findUnique({
      where: { id: commenterId },
      select: { username: true },
    });

    return this.create({
      userId: postAuthorId,
      senderId: commenterId,
      type: 'COMMENT',
      title: 'New Comment',
      message: `${commenter?.username || 'Someone'}: "${commentPreview.substring(0, 50)}..."`,
      link: `/posts/${postId}`,
      metadata: { postId },
    });
  }

  /**
   * Notify on comment reply
   */
  async notifyCommentReply(
    parentCommentAuthorId: string,
    replierId: string,
    postId: string,
    replyPreview: string
  ) {
    if (parentCommentAuthorId === replierId) return;

    const replier = await prisma.user.findUnique({
      where: { id: replierId },
      select: { username: true },
    });

    return this.create({
      userId: parentCommentAuthorId,
      senderId: replierId,
      type: 'COMMENT',
      title: 'Reply to Your Comment',
      message: `${replier?.username || 'Someone'}: "${replyPreview.substring(0, 50)}..."`,
      link: `/posts/${postId}`,
      metadata: { postId },
    });
  }

  /**
   * Notify on mention
   */
  async notifyMention(
    mentionedUserId: string,
    mentionerUserId: string,
    postId: string,
    contentType: 'post' | 'comment'
  ) {
    if (mentionedUserId === mentionerUserId) return;

    const mentioner = await prisma.user.findUnique({
      where: { id: mentionerUserId },
      select: { username: true },
    });

    return this.create({
      userId: mentionedUserId,
      senderId: mentionerUserId,
      type: 'MENTION',
      title: 'You Were Mentioned',
      message: `${mentioner?.username || 'Someone'} mentioned you in a ${contentType}`,
      link: `/posts/${postId}`,
      metadata: { postId, contentType },
    });
  }

  /**
   * Notify on project invitation
   */
  async notifyProjectInvite(
    invitedUserId: string,
    inviterUserId: string,
    projectId: string,
    projectName: string,
    role: string
  ) {
    const inviter = await prisma.user.findUnique({
      where: { id: inviterUserId },
      select: { username: true },
    });

    return this.create({
      userId: invitedUserId,
      senderId: inviterUserId,
      type: 'PROJECT_INVITE',
      title: 'Project Invitation',
      message: `${inviter?.username || 'Someone'} invited you to join "${projectName}" as ${role}`,
      link: `/projects/${projectId}`,
      metadata: { projectId, role },
    });
  }

  /**
   * Notify on project update
   */
  async notifyProjectUpdate(
    memberIds: string[],
    projectId: string,
    projectName: string,
    updateType: string,
    excludeUserId?: string
  ) {
    const recipients = memberIds.filter(id => id !== excludeUserId);

    return this.createBulk(
      recipients.map(userId => ({
        userId,
        type: 'PROJECT_UPDATE' as NotificationType,
        title: 'Project Update',
        message: `${projectName}: ${updateType}`,
        link: `/projects/${projectId}`,
        metadata: { projectId, updateType },
      }))
    );
  }

  /**
   * Notify on task assignment
   */
  async notifyTaskAssignment(
    assigneeId: string,
    assignerId: string,
    projectId: string,
    taskTitle: string
  ) {
    if (assigneeId === assignerId) return;

    const assigner = await prisma.user.findUnique({
      where: { id: assignerId },
      select: { username: true },
    });

    return this.create({
      userId: assigneeId,
      senderId: assignerId,
      type: 'SYSTEM',
      title: 'Task Assigned',
      message: `${assigner?.username || 'Someone'} assigned you: "${taskTitle}"`,
      link: `/projects/${projectId}`,
    });
  }

  /**
   * Notify on badge earned
   */
  async notifyBadgeEarned(userId: string, badgeName: string, badgeDescription: string) {
    return this.create({
      userId,
      type: 'ACHIEVEMENT',
      title: 'Badge Earned! 🏆',
      message: `You earned the "${badgeName}" badge: ${badgeDescription}`,
      link: `/profile/badges`,
    });
  }

  /**
   * System announcement to all users
   */
  async sendSystemAnnouncement(
    title: string,
    message: string,
    link?: string,
    userIds?: string[]
  ) {
    let recipients: string[];

    if (userIds) {
      recipients = userIds;
    } else {
      const users = await prisma.user.findMany({
        where: { deletedAt: null },
        select: { id: true },
      });
      recipients = users.map(u => u.id);
    }

    return this.createBulk(
      recipients.map(userId => ({
        userId,
        type: 'SYSTEM' as NotificationType,
        title,
        message,
        link,
      }))
    );
  }
}

export const notificationService = new NotificationService();
