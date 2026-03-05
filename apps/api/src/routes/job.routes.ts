// Job Routes
import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { sendSuccess, sendCreated, sendPaginated, sendNoContent } from '../utils/response.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import { authenticate, optionalAuth } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { z } from 'zod';
import slugify from 'slugify';
import { nanoid } from 'nanoid';

const router = Router();

// Validation schemas
const createJobSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(50).max(10000),
  companyName: z.string().min(1).max(200),
  companyLogo: z.string().url().optional(),
  companyWebsite: z.string().url().optional(),
  location: z.string().max(200).optional(),
  isRemote: z.boolean().default(true),
  timezone: z.string().optional(),
  type: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'FREELANCE']).default('FULL_TIME'),
  experienceLevel: z.enum(['ENTRY', 'MID', 'SENIOR', 'LEAD', 'EXECUTIVE']).default('MID'),
  salaryMin: z.number().min(0).optional(),
  salaryMax: z.number().min(0).optional(),
  salaryCurrency: z.string().default('USD'),
  equity: z.string().optional(),
  requirements: z.string().optional(),
  responsibilities: z.string().optional(),
  benefits: z.string().optional(),
  applicationUrl: z.string().url().optional(),
  applicationEmail: z.string().email().optional(),
});

const updateJobSchema = createJobSchema.partial();

// Get all jobs
router.get(
  '/',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const type = req.query.type as string;
    const isRemote = req.query.remote === 'true';
    const search = req.query.search as string;

    const where: any = {
      status: 'ACTIVE',
      OR: [
        { expiresAt: { gte: new Date() } },
        { expiresAt: null },
      ],
    };

    if (type) where.type = type;
    if (req.query.remote !== undefined) where.isRemote = isRemote;
    if (search) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { companyName: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          poster: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true,
            },
          },
          _count: {
            select: {
              applications: true,
            },
          },
        },
      }),
      prisma.job.count({ where }),
    ]);

    // Check application status for logged in users
    const jobsWithStatus = await Promise.all(
      jobs.map(async (job) => {
        let hasApplied = false;
        if (req.user?.id) {
          const application = await prisma.jobApplication.findUnique({
            where: {
              jobId_userId: {
                jobId: job.id,
                userId: req.user.id,
              },
            },
          });
          hasApplied = !!application;
        }
        return { ...job, hasApplied };
      })
    );

    return sendPaginated(res, jobsWithStatus, { page, limit, total });
  })
);

// Create job posting
router.post(
  '/',
  authenticate,
  validate(createJobSchema),
  asyncHandler(async (req, res) => {
    const data = req.body;

    // Generate slug
    const baseSlug = slugify(data.title, { lower: true, strict: true });
    const slug = `${baseSlug}-${nanoid(6)}`;

    const job = await prisma.job.create({
      data: {
        ...data,
        slug,
        posterId: req.user!.id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
      include: {
        poster: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
      },
    });

    return sendCreated(res, job, 'Job posting created');
  })
);

// Get job by ID
router.get(
  '/:id',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const job = await prisma.job.findUnique({
      where: { id: req.params.id },
      include: {
        poster: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
        skills: {
          include: {
            skill: true,
          },
        },
        _count: {
          select: {
            applications: true,
          },
        },
      },
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Increment view count
    await prisma.job.update({
      where: { id: req.params.id },
      data: { viewsCount: { increment: 1 } },
    });

    let hasApplied = false;
    if (req.user?.id) {
      const application = await prisma.jobApplication.findUnique({
        where: {
          jobId_userId: {
            jobId: job.id,
            userId: req.user.id,
          },
        },
      });
      hasApplied = !!application;
    }

    return sendSuccess(res, { ...job, hasApplied });
  })
);

// Update job
router.patch(
  '/:id',
  authenticate,
  validate(updateJobSchema),
  asyncHandler(async (req, res) => {
    const job = await prisma.job.findUnique({
      where: { id: req.params.id },
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.posterId !== req.user!.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const updated = await prisma.job.update({
      where: { id: req.params.id },
      data: req.body,
      include: {
        poster: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
      },
    });

    return sendSuccess(res, updated, 'Job updated');
  })
);

// Delete job
router.delete(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const job = await prisma.job.findUnique({
      where: { id: req.params.id },
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.posterId !== req.user!.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await prisma.job.delete({
      where: { id: req.params.id },
    });

    return sendNoContent(res);
  })
);

// Apply for job
router.post(
  '/:id/apply',
  authenticate,
  asyncHandler(async (req, res) => {
    const jobId = req.params.id;
    const userId = req.user!.id;

    // Check if job exists
    const job = await prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const existing = await prisma.jobApplication.findUnique({
      where: {
        jobId_userId: { jobId, userId },
      },
    });

    if (existing) {
      return res.status(400).json({ error: 'Already applied' });
    }

    const application = await prisma.jobApplication.create({
      data: {
        jobId,
        userId,
        coverLetter: req.body.coverLetter,
        resumeUrl: req.body.resumeUrl,
        portfolioUrl: req.body.portfolioUrl,
      },
    });

    // Update applications count
    await prisma.job.update({
      where: { id: jobId },
      data: { applicationsCount: { increment: 1 } },
    });

    return sendCreated(res, application, 'Application submitted');
  })
);

// Get my job applications
router.get(
  '/my/applications',
  authenticate,
  asyncHandler(async (req, res) => {
    const applications = await prisma.jobApplication.findMany({
      where: { userId: req.user!.id },
      include: {
        job: {
          include: {
            poster: {
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
      orderBy: { createdAt: 'desc' },
    });

    return sendSuccess(res, applications);
  })
);

// Get my job postings
router.get(
  '/my/postings',
  authenticate,
  asyncHandler(async (req, res) => {
    const jobs = await prisma.job.findMany({
      where: { posterId: req.user!.id },
      include: {
        _count: {
          select: {
            applications: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return sendSuccess(res, jobs);
  })
);

export default router;
