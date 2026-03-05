// AI Routes
import { Router } from 'express';
import { aiService } from '../services/ai.service.js';
import { sendSuccess } from '../utils/response.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { aiLimiter } from '../middleware/rateLimit.middleware.js';
import { z } from 'zod';
import { validate } from '../middleware/validate.middleware.js';

const router = Router();

// All AI routes require authentication and have rate limiting
router.use(authenticate);
router.use(aiLimiter);

// Generate startup idea
const generateIdeaSchema = z.object({
  industry: z.string().optional(),
  problemArea: z.string().optional(),
  targetAudience: z.string().optional(),
});

router.post(
  '/generate-idea',
  validate(generateIdeaSchema),
  asyncHandler(async (req, res) => {
    const idea = await aiService.generateStartupIdea(req.user!.id, req.body);
    sendSuccess(res, idea);
  })
);

// Analyze skill gaps
const skillGapSchema = z.object({
  targetRole: z.string().optional(),
});

router.post(
  '/skill-gaps',
  validate(skillGapSchema),
  asyncHandler(async (req, res) => {
    const gaps = await aiService.analyzeSkillGaps(req.user!.id, req.body.targetRole);
    sendSuccess(res, gaps);
  })
);

// Review resume
const reviewResumeSchema = z.object({
  resumeText: z.string().min(100).max(10000),
  targetRole: z.string().optional(),
});

router.post(
  '/review-resume',
  validate(reviewResumeSchema),
  asyncHandler(async (req, res) => {
    const review = await aiService.reviewResume(
      req.body.resumeText,
      req.body.targetRole
    );
    sendSuccess(res, review);
  })
);

// Find team matches (POST with project)
const teamMatchSchema = z.object({
  projectId: z.string().cuid(),
  requiredSkills: z.array(z.string()).min(1).max(10),
  limit: z.number().min(1).max(20).default(10),
});

router.post(
  '/team-matches',
  validate(teamMatchSchema),
  asyncHandler(async (req, res) => {
    const matches = await aiService.findTeamMatches(
      req.body.projectId,
      req.body.requiredSkills,
      req.body.limit
    );
    sendSuccess(res, matches);
  })
);

// Find team matches (GET - general teammate suggestions based on user skills)
router.get(
  '/team-match',
  asyncHandler(async (req, res) => {
    const skills = req.query.skills as string;
    const limit = parseInt(req.query.limit as string) || 10;
    
    // Get suggested teammates based on user's skills or provided skills
    const skillList = skills ? skills.split(',') : [];
    
    // Return suggested users who have complementary skills
    const { prisma } = await import('../lib/prisma.js');
    
    const suggestedUsers = await prisma.user.findMany({
      where: {
        id: { not: req.user?.id },
        deletedAt: null,
        isOpenToCollab: true,
        skills: skillList.length > 0 ? {
          some: {
            skill: {
              name: { in: skillList, mode: 'insensitive' as const },
            },
          },
        } : undefined,
      },
      take: limit,
      select: {
        id: true,
        username: true,
        displayName: true,
        avatar: true,
        bio: true,
        headline: true,
        location: true,
        isAvailableForHire: true,
        skills: {
          take: 5,
          include: {
            skill: true,
          },
        },
      },
    });

    const formatted = suggestedUsers.map((user) => ({
      ...user,
      skills: user.skills.map((s: any) => s.skill.name),
      matchScore: Math.random() * 0.3 + 0.7, // Placeholder score
    }));

    sendSuccess(res, formatted);
  })
);

// Generate project summary
const projectSummarySchema = z.object({
  name: z.string().min(1).max(100),
  techStack: z.array(z.string()).min(1).max(15),
  problemStatement: z.string().max(1000).optional(),
});

router.post(
  '/project-summary',
  validate(projectSummarySchema),
  asyncHandler(async (req, res) => {
    const summary = await aiService.generateProjectSummary(
      req.body.name,
      req.body.techStack,
      req.body.problemStatement
    );
    sendSuccess(res, summary);
  })
);

// Code assistant
const codeAssistantSchema = z.object({
  code: z.string().min(10).max(10000),
  language: z.string().min(1).max(50),
  action: z.enum(['explain', 'improve', 'review', 'document']),
});

router.post(
  '/code-assistant',
  validate(codeAssistantSchema),
  asyncHandler(async (req, res) => {
    const result = await aiService.codeAssistant(
      req.body.code,
      req.body.language,
      req.body.action
    );
    sendSuccess(res, { result });
  })
);

// Generate learning path
const learningPathSchema = z.object({
  targetSkills: z.array(z.string()).min(1).max(10),
});

router.post(
  '/learning-path',
  validate(learningPathSchema),
  asyncHandler(async (req, res) => {
    const path = await aiService.generateLearningPath(
      req.user!.id,
      req.body.targetSkills
    );
    sendSuccess(res, path);
  })
);

export default router;
