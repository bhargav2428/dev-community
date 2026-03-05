// Ideas Routes
import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { sendSuccess, sendCreated, sendPaginated, sendNoContent } from '../utils/response.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import { authenticate, optionalAuth } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { z } from 'zod';

const router = Router();

// Validation schemas
const createIdeaSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().min(10).max(500),
  problem: z.string().max(2000).optional(),
  solution: z.string().max(2000).optional(),
  targetAudience: z.string().max(1000).optional(),
  monetization: z.string().max(1000).optional(),
  category: z.string().optional().default('Other'),
  tags: z.array(z.string()).max(5).optional(),
  lookingForTeam: z.boolean().default(false),
});

const updateIdeaSchema = createIdeaSchema.partial();

// Get all ideas with filtering
router.get(
  '/',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const sort = (req.query.sort as string) || 'createdAt';
    const category = req.query.category as string;
    const lookingForTeam = req.query.lookingForTeam === 'true';

    const where: any = {};
    if (category) where.category = category;
    if (req.query.lookingForTeam) where.lookingForTeam = lookingForTeam;

    const orderBy: any = {};
    if (sort === 'votes') {
      orderBy.votes = { _count: 'desc' };
    } else {
      orderBy[sort] = 'desc';
    }

    const [ideas, total] = await Promise.all([
      prisma.startupIdea.findMany({
        where,
        orderBy,
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
              votes: true,
            },
          },
        },
      }),
      prisma.startupIdea.count({ where }),
    ]);

    // Check if user has voted on each idea
    const ideasWithVoteStatus = await Promise.all(
      ideas.map(async (idea) => {
        let hasVoted = false;
        if (req.user?.id) {
          const vote = await prisma.ideaVote.findUnique({
            where: {
              ideaId_userId: {
                ideaId: idea.id,
                userId: req.user.id,
              },
            },
          });
          hasVoted = !!vote;
        }
        return { ...idea, hasVoted };
      })
    );

    sendPaginated(res, ideasWithVoteStatus, { page, limit, total });
  })
);

// Create idea
router.post(
  '/',
  authenticate,
  validate(createIdeaSchema),
  asyncHandler(async (req, res) => {
    const { tags, ...data } = req.body;

    const idea = await prisma.startupIdea.create({
      data: {
        ...data,
        authorId: req.user!.id,
        tags: tags || [],
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
      },
    });

    sendCreated(res, idea, 'Idea created successfully');
  })
);

// Get idea by ID
router.get(
  '/:id',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const idea = await prisma.startupIdea.findUnique({
      where: { id: req.params.id },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            bio: true,
          },
        },
        _count: {
          select: {
            votes: true,
          },
        },
      },
    });

    if (!idea) {
      return res.status(404).json({ error: 'Idea not found' });
    }

    let hasVoted = false;
    if (req.user?.id) {
      const vote = await prisma.ideaVote.findUnique({
        where: {
          ideaId_userId: {
            ideaId: idea.id,
            userId: req.user.id,
          },
        },
      });
      hasVoted = !!vote;
    }

    return sendSuccess(res, { ...idea, hasVoted });
  })
);

// Update idea
router.patch(
  '/:id',
  authenticate,
  validate(updateIdeaSchema),
  asyncHandler(async (req, res) => {
    const idea = await prisma.startupIdea.findUnique({
      where: { id: req.params.id },
    });

    if (!idea) {
      return res.status(404).json({ error: 'Idea not found' });
    }

    if (idea.authorId !== req.user!.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const updated = await prisma.startupIdea.update({
      where: { id: req.params.id },
      data: req.body,
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
      },
    });

    return sendSuccess(res, updated, 'Idea updated');
  })
);

// Delete idea
router.delete(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const idea = await prisma.startupIdea.findUnique({
      where: { id: req.params.id },
    });

    if (!idea) {
      return res.status(404).json({ error: 'Idea not found' });
    }

    if (idea.authorId !== req.user!.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await prisma.startupIdea.delete({
      where: { id: req.params.id },
    });

    return sendNoContent(res);
  })
);

// Vote on idea
router.post(
  '/:id/vote',
  authenticate,
  asyncHandler(async (req, res) => {
    const ideaId = req.params.id;
    const userId = req.user!.id;

    const existing = await prisma.ideaVote.findUnique({
      where: {
        ideaId_userId: { ideaId, userId },
      },
    });

    if (existing) {
      // Remove vote
      await prisma.ideaVote.delete({
        where: { ideaId_userId: { ideaId, userId } },
      });
      return sendSuccess(res, { voted: false }, 'Vote removed');
    } else {
      // Add vote
      await prisma.ideaVote.create({
        data: { ideaId, userId, value: 1 },
      });
      return sendSuccess(res, { voted: true }, 'Voted successfully');
    }
  })
);

export default router;
