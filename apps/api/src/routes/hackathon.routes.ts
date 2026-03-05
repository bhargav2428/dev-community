// Hackathon Routes
import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { sendSuccess, sendCreated, sendPaginated, sendNoContent } from '../utils/response.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import { authenticate, optionalAuth } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { z } from 'zod';

const router = Router();

// Validation schemas
const createHackathonSchema = z.object({
  name: z.string().min(3).max(200),
  description: z.string().min(10).max(5000),
  startDate: z.string().datetime().or(z.date()),
  endDate: z.string().datetime().or(z.date()),
  registrationDeadline: z.string().datetime().or(z.date()).optional(),
  location: z.string().max(200).optional(),
  isOnline: z.boolean().default(true),
  maxParticipants: z.number().min(1).optional(),
  maxTeamSize: z.number().min(1).optional(),
  website: z.string().url().optional(),
  theme: z.string().max(200).optional(),
});

// Get all hackathons
router.get(
  '/',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;

    const now = new Date();
    const where: any = {};

    if (status === 'upcoming') {
      where.startDate = { gt: now };
    } else if (status === 'ongoing') {
      where.startDate = { lte: now };
      where.endDate = { gte: now };
    } else if (status === 'past') {
      where.endDate = { lt: now };
    }

    const [hackathons, total] = await Promise.all([
      prisma.hackathon.findMany({
        where,
        orderBy: { startDate: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: {
            select: {
              participants: true,
            },
          },
        },
      }),
      prisma.hackathon.count({ where }),
    ]);

    // Check registration status for each hackathon
    const hackathonsWithStatus = await Promise.all(
      hackathons.map(async (hackathon) => {
        let isRegistered = false;
        if (req.user?.id) {
          const registration = await prisma.hackathonParticipant.findUnique({
            where: {
              hackathonId_userId: {
                hackathonId: hackathon.id,
                userId: req.user.id,
              },
            },
          });
          isRegistered = !!registration;
        }
        return { ...hackathon, isRegistered };
      })
    );

    sendPaginated(res, hackathonsWithStatus, { page, limit, total });
  })
);

// Create hackathon (admin/organizer only)
router.post(
  '/',
  authenticate,
  validate(createHackathonSchema),
  asyncHandler(async (req, res) => {
    const data = req.body;

    // Generate slug from name
    const slug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + '-' + Date.now();

    const hackathon = await prisma.hackathon.create({
      data: {
        ...data,
        slug,
        organizerId: req.user!.id,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        registrationDeadline: data.registrationDeadline ? new Date(data.registrationDeadline) : undefined,
      },
    });

    sendCreated(res, hackathon, 'Hackathon created');
  })
);

// Get hackathon by ID
router.get(
  '/:id',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const hackathon = await prisma.hackathon.findUnique({
      where: { id: req.params.id },
      include: {
        participants: {
          take: 10,
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
        _count: {
          select: {
            participants: true,
          },
        },
      },
    });

    if (!hackathon) {
      return res.status(404).json({ error: 'Hackathon not found' });
    }

    let isRegistered = false;
    if (req.user?.id) {
      const registration = await prisma.hackathonParticipant.findUnique({
        where: {
          hackathonId_userId: {
            hackathonId: hackathon.id,
            userId: req.user.id,
          },
        },
      });
      isRegistered = !!registration;
    }

    return sendSuccess(res, { ...hackathon, isRegistered });
  })
);

// Register for hackathon
router.post(
  '/:id/register',
  authenticate,
  asyncHandler(async (req, res) => {
    const hackathonId = req.params.id;
    const userId = req.user!.id;

    const hackathon = await prisma.hackathon.findUnique({
      where: { id: hackathonId },
      include: { _count: { select: { participants: true } } },
    });

    if (!hackathon) {
      return res.status(404).json({ error: 'Hackathon not found' });
    }

    // Check registration deadline
    if (hackathon.registrationDeadline && new Date() > hackathon.registrationDeadline) {
      return res.status(400).json({ error: 'Registration deadline has passed' });
    }

    // Check max participants
    if (hackathon.maxParticipants && hackathon._count.participants >= hackathon.maxParticipants) {
      return res.status(400).json({ error: 'Hackathon is full' });
    }

    const existing = await prisma.hackathonParticipant.findUnique({
      where: {
        hackathonId_userId: { hackathonId, userId },
      },
    });

    if (existing) {
      return res.status(400).json({ error: 'Already registered' });
    }

    await prisma.hackathonParticipant.create({
      data: { hackathonId, userId },
    });

    return sendSuccess(res, { registered: true }, 'Successfully registered');
  })
);

// Unregister from hackathon
router.delete(
  '/:id/register',
  authenticate,
  asyncHandler(async (req, res) => {
    const hackathonId = req.params.id;
    const userId = req.user!.id;

    await prisma.hackathonParticipant.delete({
      where: {
        hackathonId_userId: { hackathonId, userId },
      },
    }).catch(() => null);

    sendNoContent(res);
  })
);

export default router;
