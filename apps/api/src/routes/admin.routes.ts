// Admin Routes
// Handles admin dashboard data, user management, and content moderation

import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { sendSuccess, sendPaginated } from '../utils/response.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import { authenticate, requireAdmin, requireModerator, requireSuperAdmin } from '../middleware/auth.middleware.js';
import { ForbiddenError, NotFoundError, BadRequestError } from '../utils/errors.js';

const router = Router();

// Helper to safely log admin actions (won't fail if AdminLog model doesn't exist)
async function logAdminAction(data: {
  adminId: string;
  action: string;
  targetType: string;
  targetId: string;
  details?: Record<string, unknown>;
}) {
  try {
    // @ts-ignore - AdminLog may not exist in Prisma client yet
    if (prisma.adminLog) {
      // @ts-ignore
      await prisma.adminLog.create({ data });
    }
  } catch (error) {
    console.warn('Unable to log admin action:', error);
  }
}

// All admin routes require authentication
router.use(authenticate);

// Get admin dashboard stats
router.get(
  '/stats',
  requireModerator,
  asyncHandler(async (_req, res) => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      totalPosts,
      totalProjects,
      totalIdeas,
      totalHackathons,
      totalJobs,
      bannedUsers,
      newUsersToday,
      newPostsToday,
      activeUsers,
      reportedContent,
    ] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.post.count({ where: { deletedAt: null } }),
      prisma.project.count(),
      prisma.startupIdea.count(),
      prisma.hackathon.count(),
      prisma.job.count({ where: { status: 'ACTIVE' } }),
      prisma.user.count({ where: { deletedAt: { not: null } } }),
      prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.post.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.user.count({ where: { updatedAt: { gte: yesterday } } }),
      prisma.report.count({ where: { status: 'PENDING' } }),
    ]);

    sendSuccess(res, {
      totalUsers,
      totalPosts,
      totalProjects,
      totalIdeas,
      totalHackathons,
      totalJobs,
      activeUsers,
      reportedContent,
      bannedUsers,
      newUsersToday,
      newPostsToday,
    });
  })
);

// Get users list with search and filtering
router.get(
  '/users',
  requireModerator,
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const role = req.query.role as string;
    const status = req.query.status as string;
    const banned = req.query.banned === 'true';
    const unverified = req.query.unverified === 'true';

    const where: any = {};

    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { displayName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role && role !== 'ALL') {
      where.role = role;
    }

    if (status?.toLowerCase() === 'banned' || banned) {
      where.deletedAt = { not: null };
    } else if (status?.toLowerCase() === 'active') {
      where.deletedAt = null;
    }

    if (unverified) {
      where.emailVerified = false;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          email: true,
          displayName: true,
          avatar: true,
          role: true,
          createdAt: true,
          deletedAt: true,
          updatedAt: true,
          _count: {
            select: {
              posts: true,
              projects: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    sendPaginated(res, users, { page, limit, total });
  })
);

// Ban user
router.post(
  '/users/:id/ban',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Cannot ban super admin
    if (user.role === 'SUPER_ADMIN') {
      throw new ForbiddenError('Cannot ban super admin');
    }

    // Only super admin can ban admin
    if (user.role === 'ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
      throw new ForbiddenError('Only super admin can ban administrators');
    }

    await prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    // Log admin action
    await logAdminAction({
      adminId: req.user!.id,
      action: 'BAN_USER',
      targetType: 'USER',
      targetId: id,
      details: { reason: reason || 'No reason provided' },
    });

    sendSuccess(res, { message: 'User banned successfully' });
  })
);

// Unban user
router.post(
  '/users/:id/unban',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    await prisma.user.update({
      where: { id },
      data: {
        deletedAt: null,
      },
    });

    // Log admin action
    await logAdminAction({
      adminId: req.user!.id,
      action: 'UNBAN_USER',
      targetType: 'USER',
      targetId: id,
      details: {},
    });

    sendSuccess(res, { message: 'User unbanned successfully' });
  })
);

// Change user role
router.patch(
  '/users/:id/role',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Only super admin can assign admin/super_admin roles
    if (['ADMIN', 'SUPER_ADMIN'].includes(role) && req.user?.role !== 'SUPER_ADMIN') {
      throw new ForbiddenError('Only super admin can assign admin roles');
    }

    // Cannot modify super admin role
    if (user.role === 'SUPER_ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
      throw new ForbiddenError('Cannot modify super admin role');
    }

    await prisma.user.update({
      where: { id },
      data: { role },
    });

    // Log admin action
    await logAdminAction({
      adminId: req.user!.id,
      action: 'CHANGE_ROLE',
      targetType: 'USER',
      targetId: id,
      details: { oldRole: user.role, newRole: role },
    });

    sendSuccess(res, { message: 'User role updated successfully' });
  })
);

// Get reports
router.get(
  '/reports',
  requireModerator,
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const type = req.query.type as string;
    const status = (req.query.status as string) || 'PENDING';

    const where: any = {};
    if (type && type !== 'ALL') {
      where.entityType = type;
    }
    if (status !== 'ALL') {
      where.status = status === 'REVIEWED' ? 'REVIEWING' : status;
    }

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        include: {
          reporter: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true,
            },
          },
          reportedUser: {
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
      prisma.report.count({ where }),
    ]);

    sendPaginated(res, reports, { page, limit, total });
  })
);

// Resolve report
router.post(
  '/reports/:id/resolve',
  requireModerator,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { action, reason } = req.body;

    const report = await prisma.report.findUnique({ where: { id } });
    if (!report) {
      throw new NotFoundError('Report not found');
    }

    // Update report status
    const nextStatus = action === 'dismiss' ? 'DISMISSED' : 'RESOLVED';

    await prisma.report.update({
      where: { id },
      data: {
        status: nextStatus,
        resolvedAt: new Date(),
        resolvedById: req.user!.id,
        resolution: reason || action || 'resolved',
      },
    });

    // Take action based on resolution
    if (action === 'remove') {
      // Remove the reported content based on type
      if (report.entityType === 'POST') {
        await prisma.post.update({
          where: { id: report.entityId },
          data: { deletedAt: new Date() },
        });
      } else if (report.entityType === 'COMMENT') {
        await prisma.comment.update({
          where: { id: report.entityId },
          data: { deletedAt: new Date() },
        });
      }
    } else if (action === 'ban') {
      // Ban the user who created the content
      if (report.reportedUserId) {
        await prisma.user.update({
          where: { id: report.reportedUserId },
          data: { deletedAt: new Date() },
        });
      }
    }

    // Log admin action
    await logAdminAction({
      adminId: req.user!.id,
      action: 'RESOLVE_REPORT',
      targetType: 'REPORT',
      targetId: id,
      details: { action, reason },
    });

    sendSuccess(res, { message: 'Report resolved successfully' });
  })
);

// Get admin activity logs
router.get(
  '/logs',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    try {
      // @ts-ignore - AdminLog may not exist in Prisma client yet
      if (!prisma.adminLog) {
        sendPaginated(res, [], { page, limit, total: 0 });
        return;
      }
      
      const [logs, total] = await Promise.all([
        // @ts-ignore
        prisma.adminLog.findMany({
          include: {
            admin: {
              select: {
                id: true,
                username: true,
                displayName: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        // @ts-ignore
        prisma.adminLog.count(),
      ]);

      sendPaginated(res, logs, { page, limit, total });
    } catch (error) {
      // Return empty logs if AdminLog model doesn't exist
      sendPaginated(res, [], { page, limit, total: 0 });
    }
  })
);

// Delete post (admin)
router.delete(
  '/posts/:id',
  requireModerator,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;

    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) {
      throw new NotFoundError('Post not found');
    }

    await prisma.post.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // Log admin action
    await logAdminAction({
      adminId: req.user!.id,
      action: 'DELETE_POST',
      targetType: 'POST',
      targetId: id,
      details: { reason: reason || 'Admin deletion' },
    });

    sendSuccess(res, { message: 'Post deleted successfully' });
  })
);

// Delete project (admin)
router.delete(
  '/projects/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;

    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) {
      throw new NotFoundError('Project not found');
    }

    await prisma.project.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // Log admin action
    await logAdminAction({
      adminId: req.user!.id,
      action: 'DELETE_PROJECT',
      targetType: 'PROJECT',
      targetId: id,
      details: { reason: reason || 'Admin deletion', projectName: project.name },
    });

    sendSuccess(res, { message: 'Project deleted successfully' });
  })
);

// ============================================
// SUPER ADMIN ONLY ROUTES
// ============================================

// Get advanced analytics (Super Admin Only)
router.get(
  '/analytics',
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const period = (req.query.period as string) || '30d';
    
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get daily user registrations
    const userGrowth = await prisma.user.groupBy({
      by: ['createdAt'],
      where: { createdAt: { gte: startDate } },
      _count: true,
    });

    // Get daily post counts
    const postGrowth = await prisma.post.groupBy({
      by: ['createdAt'],
      where: { createdAt: { gte: startDate }, deletedAt: null },
      _count: true,
    });

    // Get user engagement metrics
    const [
      totalLikes,
      totalComments,
      totalFollows,
      totalMessages,
    ] = await Promise.all([
      prisma.like.count({ where: { createdAt: { gte: startDate } } }),
      prisma.comment.count({ where: { createdAt: { gte: startDate }, deletedAt: null } }),
      prisma.follow.count({ where: { createdAt: { gte: startDate } } }),
      prisma.message.count({ where: { createdAt: { gte: startDate } } }),
    ]);

    // Get top performing content
    const topPosts = await prisma.post.findMany({
      where: { createdAt: { gte: startDate }, deletedAt: null },
      include: {
        author: { select: { id: true, username: true, displayName: true } },
        _count: { select: { likes: true, comments: true } },
      },
      orderBy: { likes: { _count: 'desc' } },
      take: 10,
    });

    // Get user role distribution
    const roleDistribution = await prisma.user.groupBy({
      by: ['role'],
      _count: true,
    });

    sendSuccess(res, {
      period,
      userGrowth: userGrowth.length,
      postGrowth: postGrowth.length,
      engagement: {
        likes: totalLikes,
        comments: totalComments,
        follows: totalFollows,
        messages: totalMessages,
      },
      topPosts,
      roleDistribution,
    });
  })
);

// Get system health (Super Admin Only)
router.get(
  '/system/health',
  requireSuperAdmin,
  asyncHandler(async (_req, res) => {
    const startTime = Date.now();
    
    // Test database connection
    let dbStatus = 'healthy';
    let dbLatency = 0;
    try {
      const dbStart = Date.now();
      // Use a simple count query to test MongoDB connection
      await prisma.user.count({ take: 1 });
      dbLatency = Date.now() - dbStart;
    } catch {
      dbStatus = 'unhealthy';
    }

    // Get database stats
    const [userCount, postCount, projectCount] = await Promise.all([
      prisma.user.count(),
      prisma.post.count(),
      prisma.project.count(),
    ]);

    sendSuccess(res, {
      status: dbStatus === 'healthy' ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        status: dbStatus,
        latency: dbLatency,
        stats: { users: userCount, posts: postCount, projects: projectCount },
      },
      memory: process.memoryUsage(),
      responseTime: Date.now() - startTime,
    });
  })
);

// Bulk user operations (Super Admin Only)
router.post(
  '/users/bulk',
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const { action, userIds, reason } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      throw new BadRequestError('User IDs are required');
    }

    if (!['ban', 'unban', 'delete', 'verify'].includes(action)) {
      throw new BadRequestError('Invalid action');
    }

    let result: { count: number } = { count: 0 };
    switch (action) {
      case 'ban':
        result = await prisma.user.updateMany({
          where: { id: { in: userIds }, role: { not: 'SUPER_ADMIN' } },
          data: { deletedAt: new Date() },
        });
        break;
      case 'unban':
        result = await prisma.user.updateMany({
          where: { id: { in: userIds } },
          data: { deletedAt: null },
        });
        break;
      case 'verify':
        result = await prisma.user.updateMany({
          where: { id: { in: userIds } },
          data: { isVerified: true },
        });
        break;
      case 'delete':
        // Soft delete - just mark as deleted
        result = await prisma.user.updateMany({
          where: { id: { in: userIds }, role: { not: 'SUPER_ADMIN' } },
          data: { deletedAt: new Date() },
        });
        break;
      default:
        throw new BadRequestError('Invalid action');
    }

    // Log admin action
    await logAdminAction({
      adminId: req.user!.id,
      action: `BULK_${action.toUpperCase()}`,
      targetType: 'USER',
      targetId: userIds.join(','),
      details: { count: result.count, reason },
    });

    sendSuccess(res, { 
      message: `${action} completed for ${result.count} users`,
      affected: result.count,
    });
  })
);

// Get all posts for admin (with filters)
router.get(
  '/posts',
  requireModerator,
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const status = req.query.status as string;
    const authorId = req.query.authorId as string;
    const type = req.query.type as string;
    const featured = req.query.featured === 'true';
    const reported = req.query.reported === 'true';
    const deleted = req.query.deleted === 'true';
    const active = req.query.active === 'true';

    const where: any = {};
    
    if (search) {
      where.content = { contains: search, mode: 'insensitive' };
    }
    
    if (status === 'deleted' || deleted) {
      where.deletedAt = { not: null };
    } else if (status === 'active' || active) {
      where.deletedAt = null;
    }

    if (type && type !== 'ALL') {
      where.type = type;
    }

    if (featured) {
      where.isFeatured = true;
    }

    if (reported) {
      const reportedPostIds = await prisma.report.findMany({
        where: { entityType: 'POST' },
        select: { entityId: true },
      });
      where.id = { in: reportedPostIds.map((r) => r.entityId) };
    }
    
    if (authorId) {
      where.authorId = authorId;
    }

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        include: {
          author: { select: { id: true, username: true, displayName: true, avatar: true } },
          _count: { select: { likes: true, comments: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.post.count({ where }),
    ]);

    const postIds = posts.map((post) => post.id);
    const groupedReports = postIds.length
      ? await prisma.report.groupBy({
          by: ['entityId'],
          where: {
            entityType: 'POST',
            entityId: { in: postIds },
          },
          _count: { _all: true },
        })
      : [];

    const reportCountMap = (groupedReports as any).reduce(
      (acc: Record<string, number>, row: any) => {
        acc[row.entityId] = row._count._all;
        return acc;
      },
      {} as Record<string, number>
    );

    const postsWithReportCount = posts.map((post) => ({
      ...post,
      _count: {
        ...post._count,
        reports: reportCountMap[post.id] || 0,
      },
    }));

    sendPaginated(res, postsWithReportCount as any[], { page, limit, total });
  })
);

// Feature/Unfeature a post
router.post(
  '/posts/:id/feature',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { featured } = req.body;

    await prisma.post.update({
      where: { id },
      data: { isFeatured: featured },
    });

    await logAdminAction({
      adminId: req.user!.id,
      action: featured ? 'FEATURE_POST' : 'UNFEATURE_POST',
      targetType: 'POST',
      targetId: id,
      details: {},
    });

    sendSuccess(res, { message: `Post ${featured ? 'featured' : 'unfeatured'} successfully` });
  })
);

// Update post fields (admin)
router.patch(
  '/posts/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { pinned, featured } = req.body;

    const data: Record<string, unknown> = {};
    if (typeof pinned === 'boolean') data.isPinned = pinned;
    if (typeof featured === 'boolean') data.isFeatured = featured;

    if (Object.keys(data).length === 0) {
      throw new BadRequestError('No valid update fields provided');
    }

    await prisma.post.update({
      where: { id },
      data,
    });

    await logAdminAction({
      adminId: req.user!.id,
      action: 'UPDATE_POST',
      targetType: 'POST',
      targetId: id,
      details: data,
    });

    sendSuccess(res, { message: 'Post updated successfully' });
  })
);

// Restore deleted content
router.post(
  '/posts/:id/restore',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    await prisma.post.update({
      where: { id },
      data: { deletedAt: null },
    });

    await logAdminAction({
      adminId: req.user!.id,
      action: 'RESTORE_POST',
      targetType: 'POST',
      targetId: id,
      details: {},
    });

    sendSuccess(res, { message: 'Post restored successfully' });
  })
);

// Get all projects for admin
router.get(
  '/projects',
  requireModerator,
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const status = req.query.status as string;
    const visibility = req.query.visibility as string;
    const deleted = req.query.deleted === 'true';

    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (visibility && visibility !== 'ALL') {
      where.visibility = visibility;
    }

    if (deleted) {
      where.deletedAt = { not: null };
    } else {
      where.deletedAt = null;
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        include: {
          owner: { select: { id: true, username: true, displayName: true } },
          _count: { select: { members: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.project.count({ where }),
    ]);

    sendPaginated(res, projects, { page, limit, total });
  })
);

// Get all ideas for admin
router.get(
  '/ideas',
  requireModerator,
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const status = req.query.status as string;
    const stage = req.query.stage as string;
    const deleted = req.query.deleted === 'true';

    const where: any = {};
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { problem: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (status && status !== 'ALL') {
      const normalizedStatus =
        status === 'IN_PROGRESS' ? 'BUILDING' :
        status === 'IMPLEMENTED' ? 'CLOSED' :
        status;
      where.status = normalizedStatus;
    }

    if (stage && stage !== 'ALL') {
      where.stage = stage;
    }

    if (deleted) {
      where.deletedAt = { not: null };
    } else {
      where.deletedAt = null;
    }

    const [ideas, total] = await Promise.all([
      prisma.startupIdea.findMany({
        where,
        include: {
          author: { select: { id: true, username: true, displayName: true } },
          _count: { select: { votes: true, team: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.startupIdea.count({ where }),
    ]);

    const ideaIds = ideas.map((idea) => idea.id);
    const voteGroups = ideaIds.length
      ? await prisma.ideaVote.groupBy({
          by: ['ideaId', 'value'],
          where: { ideaId: { in: ideaIds } },
          _count: { _all: true },
        })
      : [];

    const voteCountMap = (voteGroups as any).reduce(
      (acc: Record<string, { upvotes: number; downvotes: number }>, row: any) => {
        if (!acc[row.ideaId]) {
          acc[row.ideaId] = { upvotes: 0, downvotes: 0 };
        }
        if (row.value > 0) acc[row.ideaId].upvotes += row._count._all;
        if (row.value < 0) acc[row.ideaId].downvotes += row._count._all;
        return acc;
      },
      {} as Record<string, { upvotes: number; downvotes: number }>
    );

    const ideasWithCounts = ideas.map((idea) => ({
      ...idea,
      _count: {
        upvotes: voteCountMap[idea.id]?.upvotes || 0,
        downvotes: voteCountMap[idea.id]?.downvotes || 0,
        comments: idea.commentsCount,
        collaborators: idea._count?.team || 0,
      },
    }));

    sendPaginated(res, ideasWithCounts as any[], { page, limit, total });
  })
);

// Delete idea (admin)
router.delete(
  '/ideas/:id',
  requireModerator,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;

    const idea = await prisma.startupIdea.findUnique({ where: { id } });
    if (!idea) {
      throw new NotFoundError('Idea not found');
    }

    await prisma.startupIdea.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await logAdminAction({
      adminId: req.user!.id,
      action: 'DELETE_IDEA',
      targetType: 'IDEA',
      targetId: id,
      details: { reason: reason || 'Admin deletion', ideaTitle: idea.title },
    });

    sendSuccess(res, { message: 'Idea deleted successfully' });
  })
);

// Update idea status (admin)
router.patch(
  '/ideas/:id',
  requireModerator,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const normalizedStatus =
      status === 'IN_PROGRESS' ? 'BUILDING' :
      status === 'IMPLEMENTED' ? 'CLOSED' :
      status;

    await prisma.startupIdea.update({
      where: { id },
      data: { status: normalizedStatus },
    });

    await logAdminAction({
      adminId: req.user!.id,
      action: 'UPDATE_IDEA_STATUS',
      targetType: 'IDEA',
      targetId: id,
      details: { status: normalizedStatus },
    });

    sendSuccess(res, { message: 'Idea status updated successfully' });
  })
);

// Get all jobs for admin
router.get(
  '/jobs',
  requireModerator,
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const status = req.query.status as string;
    const type = req.query.type as string;
    const deleted = req.query.deleted === 'true';

    const where: any = {};
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { companyName: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (type && type !== 'ALL') {
      where.type = type;
    }

    if (deleted) {
      where.deletedAt = { not: null };
    } else {
      where.deletedAt = null;
    }

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        include: {
          poster: { select: { id: true, username: true, displayName: true } },
          _count: { select: { applications: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.job.count({ where }),
    ]);

    sendPaginated(res, jobs, { page, limit, total });
  })
);

// Update job status (admin)
router.patch(
  '/jobs/:id/status',
  requireModerator,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    await prisma.job.update({
      where: { id },
      data: { status },
    });

    await logAdminAction({
      adminId: req.user!.id,
      action: 'UPDATE_JOB_STATUS',
      targetType: 'JOB',
      targetId: id,
      details: { status },
    });

    sendSuccess(res, { message: 'Job status updated' });
  })
);

// Get all hackathons for admin
router.get(
  '/hackathons',
  requireModerator,
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const status = req.query.status as string;
    const deleted = req.query.deleted === 'true';

    const where: any = {};
    
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }
    
    if (status && status !== 'ALL') {
      where.status = status === 'ONGOING' ? 'IN_PROGRESS' : status;
    }

    if (deleted) {
      where.deletedAt = { not: null };
    } else {
      where.deletedAt = null;
    }

    const [hackathons, total] = await Promise.all([
      prisma.hackathon.findMany({
        where,
        include: {
          _count: { select: { participants: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.hackathon.count({ where }),
    ]);

    sendPaginated(res, hackathons, { page, limit, total });
  })
);

// Delete comment (admin)
router.delete(
  '/comments/:id',
  requireModerator,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;

    await prisma.comment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await logAdminAction({
      adminId: req.user!.id,
      action: 'DELETE_COMMENT',
      targetType: 'COMMENT',
      targetId: id,
      details: { reason: reason || 'Admin deletion' },
    });

    sendSuccess(res, { message: 'Comment deleted successfully' });
  })
);

// Get user details (admin view)
router.get(
  '/users/:id',
  requireModerator,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatar: true,
        bio: true,
        role: true,
        isVerified: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        lastSeenAt: true,
        reputationScore: true,
        _count: {
          select: {
            posts: true,
            projects: true,
            ownedProjects: true,
            comments: true,
            likes: true,
            followers: true,
            following: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Get user's recent activity
    const recentPosts = await prisma.post.findMany({
      where: { authorId: id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, content: true, createdAt: true },
    });

    // Get user's reports (both made and received)
    const [reportsMade, reportsReceived] = await Promise.all([
      prisma.report.count({ where: { reporterId: id } }),
      prisma.report.count({ where: { reportedUserId: id } }),
    ]);

    sendSuccess(res, {
      ...user,
      recentPosts,
      reports: { made: reportsMade, received: reportsReceived },
    });
  })
);

// Send warning to user (Super Admin Only)
router.post(
  '/users/:id/warn',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    // Accept both 'reason' (from frontend) and 'message' (for backward compatibility)
    const { reason, message, severity } = req.body;
    const notificationMessage = reason || message;

    if (!notificationMessage) {
      return res.status(400).json({ message: 'Warning message is required.' });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Create notification for the user
    await prisma.notification.create({
      data: {
        userId: id,
        type: 'SYSTEM',
        title: `Warning from Admin`,
        message: notificationMessage,
        entityType: 'WARNING',
        entityId: severity || 'medium',
      },
    });

    await logAdminAction({
      adminId: req.user!.id,
      action: 'WARN_USER',
      targetType: 'USER',
      targetId: id,
      details: { message: notificationMessage, severity },
    });

    sendSuccess(res, { message: 'Warning sent to user' });
  })
);

// Create system-wide announcement (Super Admin Only)
router.post(
  '/announcements',
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const {
      title,
      content,
      type,
      targetAudience,
      isPinned,
      showBanner,
      startDate,
      endDate
    } = req.body;

    // Get all users (or filter by audience)
    let userFilter: any = { deletedAt: null };
    if (targetAudience === 'ADMINS') userFilter.role = 'ADMIN';
    if (targetAudience === 'MODERATORS') userFilter.role = 'MODERATOR';
    if (targetAudience === 'USERS') userFilter.role = 'USER';
    // Default: ALL

    const users = await prisma.user.findMany({
      where: userFilter,
      select: { id: true },
    });

    // Create notifications for all users with extra fields
    await prisma.notification.createMany({
      data: users.map((user) => ({
        userId: user.id,
        type: 'SYSTEM' as const,
        title,
        message: content || title,
        entityType: 'ANNOUNCEMENT',
        entityId: type || 'INFO',
        isPinned: !!isPinned,
        showBanner: !!showBanner,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        readAt: null,
      })),
    });

    await logAdminAction({
      adminId: req.user!.id,
      action: 'CREATE_ANNOUNCEMENT',
      targetType: 'SYSTEM',
      targetId: 'announcement',
      details: { title, recipientCount: users.length, targetAudience, isPinned, showBanner, startDate, endDate },
    });

    sendSuccess(res, { 
      message: 'Announcement sent',
      recipientCount: users.length,
    });
  })
);

// Get platform settings (Super Admin Only)
router.get(
  '/settings',
  requireSuperAdmin,
  asyncHandler(async (_req, res) => {
    // Return default settings - in a real app, these would come from database
    sendSuccess(res, {
      registration: {
        enabled: true,
        requireEmailVerification: true,
        allowedDomains: [],
      },
      moderation: {
        autoModeration: false,
        spamThreshold: 0.8,
        requireApproval: false,
      },
      features: {
        jobs: true,
        hackathons: true,
        ideas: true,
        messaging: true,
        projects: true,
      },
      limits: {
        maxPostLength: 5000,
        maxBioLength: 500,
        maxProjectsPerUser: 50,
        maxIdeasPerUser: 20,
      },
    });
  })
);

// Export users data (Super Admin Only)
router.get(
  '/export/users',
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const format = req.query.format as string || 'json';

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        role: true,
        createdAt: true,
        emailVerified: true,
        isVerified: true,
        deletedAt: true,
        _count: {
          select: { posts: true, projects: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    await logAdminAction({
      adminId: req.user!.id,
      action: 'EXPORT_USERS',
      targetType: 'SYSTEM',
      targetId: 'export',
      details: { count: users.length, format },
    });

    if (format === 'csv') {
      // Convert to CSV format
      const headers = 'id,email,username,displayName,role,createdAt,emailVerified,isVerified,posts,projects\n';
      const rows = users.map(u => 
        `${u.id},${u.email},${u.username},${u.displayName || ''},${u.role},${u.createdAt.toISOString()},${u.emailVerified},${u.isVerified},${u._count.posts},${u._count.projects}`
      ).join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=users-export.csv');
      res.send(headers + rows);
    } else {
      sendSuccess(res, users);
    }
  })
);

// Update platform settings (Super Admin Only)
router.put(
  '/settings',
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const settings = req.body;

    // In a real app, save to database. For now, just log and return success
    await logAdminAction({
      adminId: req.user!.id,
      action: 'UPDATE_SETTINGS',
      targetType: 'SYSTEM',
      targetId: 'settings',
      details: settings,
    });

    sendSuccess(res, { message: 'Settings updated successfully' });
  })
);

// Get all announcements
router.get(
  '/announcements',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    // Since we don't have an Announcement model, return notifications of type SYSTEM as announcements
    const [announcements, total] = await Promise.all([
      prisma.notification.findMany({
        where: { type: 'SYSTEM' },
        distinct: ['title'],
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notification.count({
        where: { type: 'SYSTEM' },
      }),
    ]);

    sendPaginated(res, announcements, { page, limit, total });
  })
);

// Update announcement
router.patch(
  '/announcements/:id',
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { title, content, type, targetAudience, isActive } = req.body;

    const data: any = {};
    if (title !== undefined) data.title = title;
    if (content !== undefined) data.message = content;
    if (type !== undefined) data.entityType = type;
    if (targetAudience !== undefined) data.entityId = targetAudience;
    if (isActive === false) data.readAt = new Date();
    if (isActive === true) data.readAt = null;

    await prisma.notification.update({
      where: { id },
      data,
    });

    await logAdminAction({
      adminId: req.user!.id,
      action: 'UPDATE_ANNOUNCEMENT',
      targetType: 'SYSTEM',
      targetId: id,
      details: data,
    });

    sendSuccess(res, { message: 'Announcement updated successfully' });
  })
);

// Delete announcement (deletes all notifications with that title)
router.delete(
  '/announcements/:id',
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    await prisma.notification.delete({
      where: { id },
    });

    await logAdminAction({
      adminId: req.user!.id,
      action: 'DELETE_ANNOUNCEMENT',
      targetType: 'SYSTEM',
      targetId: id,
      details: {},
    });

    sendSuccess(res, { message: 'Announcement deleted' });
  })
);

// Feature/unfeature a project (Admin)
router.put(
  '/projects/:id/feature',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { featured } = req.body;

    await prisma.project.update({
      where: { id },
      data: { isFeatured: featured },
    });

    await logAdminAction({
      adminId: req.user!.id,
      action: featured ? 'FEATURE_PROJECT' : 'UNFEATURE_PROJECT',
      targetType: 'PROJECT',
      targetId: id,
      details: { featured },
    });

    sendSuccess(res, { message: `Project ${featured ? 'featured' : 'unfeatured'} successfully` });
  })
);

// Restore an idea (Admin)
router.put(
  '/ideas/:id/restore',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    await prisma.startupIdea.update({
      where: { id },
      data: { deletedAt: null },
    });

    await logAdminAction({
      adminId: req.user!.id,
      action: 'RESTORE_IDEA',
      targetType: 'IDEA',
      targetId: id,
      details: {},
    });

    sendSuccess(res, { message: 'Idea restored successfully' });
  })
);

// Restore an idea (Admin) - POST alias
router.post(
  '/ideas/:id/restore',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    await prisma.startupIdea.update({
      where: { id },
      data: { deletedAt: null },
    });

    await logAdminAction({
      adminId: req.user!.id,
      action: 'RESTORE_IDEA',
      targetType: 'IDEA',
      targetId: id,
      details: {},
    });

    sendSuccess(res, { message: 'Idea restored successfully' });
  })
);

// Restore project (Admin)
router.put(
  '/projects/:id/restore',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    await prisma.project.update({
      where: { id },
      data: { deletedAt: null },
    });

    await logAdminAction({
      adminId: req.user!.id,
      action: 'RESTORE_PROJECT',
      targetType: 'PROJECT',
      targetId: id,
      details: {},
    });

    sendSuccess(res, { message: 'Project restored successfully' });
  })
);

// Feature/unfeature a job (Admin)
router.put(
  '/jobs/:id/feature',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { featured } = req.body;

    await prisma.job.update({
      where: { id },
      data: { isFeatured: featured },
    });

    await logAdminAction({
      adminId: req.user!.id,
      action: featured ? 'FEATURE_JOB' : 'UNFEATURE_JOB',
      targetType: 'JOB',
      targetId: id,
      details: { featured },
    });

    sendSuccess(res, { message: `Job ${featured ? 'featured' : 'unfeatured'} successfully` });
  })
);

// Delete a job (Admin)
router.delete(
  '/jobs/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    await prisma.job.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await logAdminAction({
      adminId: req.user!.id,
      action: 'DELETE_JOB',
      targetType: 'JOB',
      targetId: id,
      details: {},
    });

    sendSuccess(res, { message: 'Job deleted successfully' });
  })
);

// Restore a job (Admin)
router.put(
  '/jobs/:id/restore',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    await prisma.job.update({
      where: { id },
      data: { deletedAt: null },
    });

    await logAdminAction({
      adminId: req.user!.id,
      action: 'RESTORE_JOB',
      targetType: 'JOB',
      targetId: id,
      details: {},
    });

    sendSuccess(res, { message: 'Job restored successfully' });
  })
);

// Bulk job operations (Admin)
router.post(
  '/jobs/bulk',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { jobIds, action } = req.body;

    if (!Array.isArray(jobIds) || jobIds.length === 0) {
      throw new BadRequestError('jobIds must be a non-empty array');
    }

    let result: any;
    switch (action) {
      case 'delete':
        result = await prisma.job.updateMany({
          where: { id: { in: jobIds } },
          data: { deletedAt: new Date() },
        });
        break;
      case 'activate':
        result = await prisma.job.updateMany({
          where: { id: { in: jobIds } },
          data: { status: 'ACTIVE' },
        });
        break;
      case 'pause':
        result = await prisma.job.updateMany({
          where: { id: { in: jobIds } },
          data: { status: 'PAUSED' },
        });
        break;
      case 'feature':
        result = await prisma.job.updateMany({
          where: { id: { in: jobIds } },
          data: { isFeatured: true },
        });
        break;
      default:
        throw new BadRequestError('Invalid action');
    }

    await logAdminAction({
      adminId: req.user!.id,
      action: `BULK_${action.toUpperCase()}_JOBS`,
      targetType: 'JOB',
      targetId: 'bulk',
      details: { jobIds, count: result.count },
    });

    sendSuccess(res, { message: `${result.count} jobs updated`, count: result.count });
  })
);

// Update hackathon status (Admin)
router.patch(
  '/hackathons/:id/status',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    await prisma.hackathon.update({
      where: { id },
      data: { status },
    });

    await logAdminAction({
      adminId: req.user!.id,
      action: 'UPDATE_HACKATHON_STATUS',
      targetType: 'HACKATHON',
      targetId: id,
      details: { status },
    });

    sendSuccess(res, { message: 'Hackathon status updated' });
  })
);

// Feature/unfeature a hackathon (Admin)
router.put(
  '/hackathons/:id/feature',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { featured } = req.body;

    await prisma.hackathon.update({
      where: { id },
      data: { isFeatured: featured },
    });

    await logAdminAction({
      adminId: req.user!.id,
      action: featured ? 'FEATURE_HACKATHON' : 'UNFEATURE_HACKATHON',
      targetType: 'HACKATHON',
      targetId: id,
      details: { featured },
    });

    sendSuccess(res, { message: `Hackathon ${featured ? 'featured' : 'unfeatured'} successfully` });
  })
);

// Delete a hackathon (Admin)
router.delete(
  '/hackathons/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    await prisma.hackathon.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await logAdminAction({
      adminId: req.user!.id,
      action: 'DELETE_HACKATHON',
      targetType: 'HACKATHON',
      targetId: id,
      details: {},
    });

    sendSuccess(res, { message: 'Hackathon deleted successfully' });
  })
);

// Restore a hackathon (Admin)
router.put(
  '/hackathons/:id/restore',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    await prisma.hackathon.update({
      where: { id },
      data: { deletedAt: null },
    });

    await logAdminAction({
      adminId: req.user!.id,
      action: 'RESTORE_HACKATHON',
      targetType: 'HACKATHON',
      targetId: id,
      details: {},
    });

    sendSuccess(res, { message: 'Hackathon restored successfully' });
  })
);

// Bulk hackathon operations (Admin)
router.post(
  '/hackathons/bulk',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { hackathonIds, action } = req.body;

    if (!Array.isArray(hackathonIds) || hackathonIds.length === 0) {
      throw new BadRequestError('hackathonIds must be a non-empty array');
    }

    let result: any;
    switch (action) {
      case 'delete':
        result = await prisma.hackathon.updateMany({
          where: { id: { in: hackathonIds } },
          data: { deletedAt: new Date() },
        });
        break;
      case 'feature':
        result = await prisma.hackathon.updateMany({
          where: { id: { in: hackathonIds } },
          data: { isFeatured: true },
        });
        break;
      default:
        throw new BadRequestError('Invalid action');
    }

    await logAdminAction({
      adminId: req.user!.id,
      action: `BULK_${action.toUpperCase()}_HACKATHONS`,
      targetType: 'HACKATHON',
      targetId: 'bulk',
      details: { hackathonIds, count: result.count },
    });

    sendSuccess(res, { message: `${result.count} hackathons updated`, count: result.count });
  })
);

// Export logs data (Super Admin Only)
router.get(
  '/export/logs',
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const format = req.query.format as string || 'json';
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    const where: any = {};
    if (startDate) {
      where.createdAt = { ...where.createdAt, gte: new Date(startDate) };
    }
    if (endDate) {
      where.createdAt = { ...where.createdAt, lte: new Date(endDate) };
    }

    let logs: any[] = [];
    try {
      // @ts-ignore - AdminLog may not exist in Prisma client yet
      if (prisma.adminLog) {
        // @ts-ignore
        logs = await prisma.adminLog.findMany({
          where,
          include: {
            admin: {
              select: { username: true, email: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10000, // Limit export
        });
      }
    } catch (error) {
      console.warn('Unable to fetch admin logs:', error);
    }

    await logAdminAction({
      adminId: req.user!.id,
      action: 'EXPORT_LOGS',
      targetType: 'SYSTEM',
      targetId: 'export',
      details: { count: logs.length, format },
    });

    if (format === 'csv') {
      const headers = 'id,action,targetType,targetId,adminEmail,createdAt,details\n';
      const rows = logs.map((l: any) => 
        `${l.id},${l.action},${l.targetType},${l.targetId},${l.admin?.email || ''},${l.createdAt.toISOString()},"${JSON.stringify(l.details).replace(/"/g, '""')}"`
      ).join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=admin-logs-export.csv');
      res.send(headers + rows);
    } else {
      sendSuccess(res, logs);
    }
  })
);

export default router;
