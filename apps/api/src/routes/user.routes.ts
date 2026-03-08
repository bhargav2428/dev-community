// User Routes
import { Router } from 'express';
import { userService } from '../services/user.service.js';
import { prisma } from '../lib/prisma.js';
import { sendSuccess, sendPaginated } from '../utils/response.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import { authenticate, optionalAuth } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { NotFoundError } from '../utils/errors.js';
import {
  updateProfileSchema,
  addSkillSchema,
  addExperienceSchema,
  addEducationSchema,
  searchUsersSchema,
} from '../schemas/user.schema.js';

const router = Router();

// Get current authenticated user
router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        avatar: true,
        bio: true,
        role: true,
        createdAt: true,
        skills: { include: { skill: true } },
        _count: {
          select: {
            posts: true,
            projects: true,
            followers: true,
            following: true,
          },
        },
      },
    });
    if (!user) {
      throw new NotFoundError('User not found');
    }
    sendSuccess(res, user);
  })
);

// Update current authenticated user
router.patch(
  '/me',
  authenticate,
  validate(updateProfileSchema),
  asyncHandler(async (req, res) => {
    const user = await userService.updateProfile(req.user!.id, req.body);
    sendSuccess(res, user, 'Profile updated');
  })
);

// Search users
router.get(
  '/search',
  optionalAuth,
  validate(searchUsersSchema, 'query'),
  asyncHandler(async (req, res) => {
    const result = await userService.searchUsers(req.query as any);
    sendPaginated(res, result.data, {
      page: result.page,
      limit: result.limit,
      total: result.total,
    });
  })
);

// Discover users (for teammates page)
router.get(
  '/discover',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { isOpenToCollab, skill, search, page = 1, limit = 20 } = req.query;
    const result = await userService.searchUsers({
      query: search as string,
      skills: skill ? [skill as string] : undefined,
      isAvailableForHire: isOpenToCollab === 'true' ? true : undefined,
      page: Number(page),
      limit: Number(limit),
    });
    sendPaginated(res, result.data, {
      page: result.page,
      limit: result.limit,
      total: result.total,
    });
  })
);

// Get leaderboard
router.get(
  '/leaderboard',
  asyncHandler(async (req, res) => {
    const type = (req.query.type as 'reputation' | 'contributions' | 'projects') || 'reputation';
    const limit = parseInt(req.query.limit as string) || 50;
    const users = await userService.getLeaderboard(type, limit);
    sendSuccess(res, users);
  })
);

// Get suggested users
router.get(
  '/suggestions',
  authenticate,
  asyncHandler(async (req, res) => {
    const users = await userService.getSuggestedUsers(req.user!.id);
    sendSuccess(res, users);
  })
);

// Get user's posts by username
router.get(
  '/:username/posts',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { username } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where: { authorId: user.id, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          author: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true,
            },
          },
          _count: {
            select: {
              likes: true,
              comments: true,
            },
          },
        },
      }),
      prisma.post.count({ where: { authorId: user.id, deletedAt: null } }),
    ]);

    sendPaginated(res, posts, { page, limit, total });
  })
);

// Get user's projects by username
router.get(
  '/:username/projects',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { username } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where: { ownerId: user.id },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          owner: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true,
            },
          },
          _count: {
            select: {
              members: true,
            },
          },
        },
      }),
      prisma.project.count({ where: { ownerId: user.id } }),
    ]);

    sendPaginated(res, projects, { page, limit, total });
  })
);

// Get user by username
router.get(
  '/:username',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const user = await userService.getUserByUsername(
      req.params.username,
      req.user?.id
    );
    sendSuccess(res, user);
  })
);

// Update profile
router.patch(
  '/profile',
  authenticate,
  validate(updateProfileSchema),
  asyncHandler(async (req, res) => {
    const user = await userService.updateProfile(req.user!.id, req.body);
    sendSuccess(res, user, 'Profile updated');
  })
);

// Skills
router.post(
  '/skills',
  authenticate,
  validate(addSkillSchema),
  asyncHandler(async (req, res) => {
    const skill = await userService.addSkill(req.user!.id, req.body);
    sendSuccess(res, skill, 'Skill added');
  })
);

router.delete(
  '/skills/:skillId',
  authenticate,
  asyncHandler(async (req, res) => {
    await userService.removeSkill(req.user!.id, req.params.skillId);
    sendSuccess(res, null, 'Skill removed');
  })
);

// Experience
router.post(
  '/experience',
  authenticate,
  validate(addExperienceSchema),
  asyncHandler(async (req, res) => {
    const experience = await userService.addExperience(req.user!.id, req.body);
    sendSuccess(res, experience, 'Experience added');
  })
);

router.patch(
  '/experience/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const experience = await userService.updateExperience(
      req.user!.id,
      req.params.id,
      req.body
    );
    sendSuccess(res, experience, 'Experience updated');
  })
);

router.delete(
  '/experience/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    await userService.deleteExperience(req.user!.id, req.params.id);
    sendSuccess(res, null, 'Experience deleted');
  })
);

// Education
router.post(
  '/education',
  authenticate,
  validate(addEducationSchema),
  asyncHandler(async (req, res) => {
    const education = await userService.addEducation(req.user!.id, req.body);
    sendSuccess(res, education, 'Education added');
  })
);

// Follow/Unfollow
router.post(
  '/:userId/follow',
  authenticate,
  asyncHandler(async (req, res) => {
    await userService.followUser(req.user!.id, req.params.userId);
    sendSuccess(res, null, 'Following user');
  })
);

router.delete(
  '/:userId/follow',
  authenticate,
  asyncHandler(async (req, res) => {
    await userService.unfollowUser(req.user!.id, req.params.userId);
    sendSuccess(res, null, 'Unfollowed user');
  })
);

// Followers/Following
router.get(
  '/:userId/followers',
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await userService.getFollowers(req.params.userId, page, limit);
    sendPaginated(res, result.data, {
      page: result.page,
      limit: result.limit,
      total: result.total,
    });
  })
);

router.get(
  '/:userId/following',
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await userService.getFollowing(req.params.userId, page, limit);
    sendPaginated(res, result.data, {
      page: result.page,
      limit: result.limit,
      total: result.total,
    });
  })
);

// Activity
router.get(
  '/:userId/activity',
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await userService.getUserActivity(req.params.userId, page, limit);
    sendPaginated(res, result.data, {
      page: result.page,
      limit: result.limit,
      total: result.total,
    });
  })
);

export default router;
