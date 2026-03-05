import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Get all bounties
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status = 'OPEN', difficulty, skill, minReward, maxReward } = req.query;
    
    const where: any = {};
    
    if (status) where.status = status;
    if (difficulty) where.difficulty = difficulty;
    if (skill) where.skills = { has: skill as string };
    
    const bounties = await prisma.codeBounty.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          }
        },
        _count: {
          select: { submissions: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    
    res.json({
      success: true,
      data: bounties
    });
  } catch (error) {
    console.error('Error fetching bounties:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bounties'
    });
  }
});

// Get bounty by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const bounty = await prisma.codeBounty.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            headline: true,
          }
        },
        submissions: {
          include: {
            submitter: {
              select: { id: true, username: true, displayName: true, avatar: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        winner: {
          include: {
            submitter: {
              select: { id: true, username: true, displayName: true, avatar: true }
            }
          }
        }
      }
    });
    
    if (!bounty) {
      return res.status(404).json({
        success: false,
        message: 'Bounty not found'
      });
    }
    
    res.json({
      success: true,
      data: bounty
    });
  } catch (error) {
    console.error('Error fetching bounty:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bounty'
    });
  }
});

// Create a bounty
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }
    
    const {
      title,
      description,
      requirements,
      rewardType,
      rewardAmount,
      rewardCurrency,
      difficulty,
      skills,
      languages,
      estimatedHours,
      repoUrl,
      issueUrl,
      deadline,
    } = req.body;
    
    if (!title || !description || !difficulty || !rewardAmount) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }
    
    const bounty = await prisma.codeBounty.create({
      data: {
        creatorId: userId,
        title,
        description,
        requirements: requirements || [],
        rewardType: rewardType || 'POINTS',
        rewardAmount,
        rewardCurrency,
        difficulty,
        skills: skills || [],
        languages: languages || [],
        estimatedHours,
        repoUrl,
        issueUrl,
        deadline: deadline ? new Date(deadline) : null,
        status: 'OPEN',
      },
      include: {
        creator: {
          select: { id: true, username: true, displayName: true, avatar: true }
        }
      }
    });
    
    res.status(201).json({
      success: true,
      data: bounty
    });
  } catch (error) {
    console.error('Error creating bounty:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create bounty'
    });
  }
});

// Submit solution for a bounty
router.post('/:id/submit', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }
    
    const { description, solutionUrl, codeSnippet } = req.body;
    
    // Check if bounty exists and is open
    const bounty = await prisma.codeBounty.findUnique({
      where: { id }
    });
    
    if (!bounty) {
      return res.status(404).json({
        success: false,
        message: 'Bounty not found'
      });
    }
    
    if (bounty.status !== 'OPEN' && bounty.status !== 'IN_PROGRESS') {
      return res.status(400).json({
        success: false,
        message: 'Bounty is not accepting submissions'
      });
    }
    
    if (bounty.creatorId === userId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot submit to your own bounty'
      });
    }
    
    // Check for existing submission
    const existingSubmission = await prisma.bountySubmission.findUnique({
      where: {
        bountyId_submitterId: {
          bountyId: id,
          submitterId: userId
        }
      }
    });
    
    if (existingSubmission) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted to this bounty'
      });
    }
    
    const submission = await prisma.bountySubmission.create({
      data: {
        bountyId: id,
        submitterId: userId,
        description,
        solutionUrl,
        codeSnippet,
        status: 'PENDING',
      },
      include: {
        submitter: {
          select: { id: true, username: true, displayName: true, avatar: true }
        }
      }
    });
    
    // Update bounty status to IN_PROGRESS
    await prisma.codeBounty.update({
      where: { id },
      data: { status: 'IN_PROGRESS' }
    });
    
    res.status(201).json({
      success: true,
      data: submission
    });
  } catch (error) {
    console.error('Error submitting solution:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit solution'
    });
  }
});

// Select winner for a bounty
router.post('/:id/winner/:submissionId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id, submissionId } = req.params;
    const { feedback } = req.body;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }
    
    const bounty = await prisma.codeBounty.findUnique({
      where: { id }
    });
    
    if (!bounty || bounty.creatorId !== userId) {
      return res.status(404).json({
        success: false,
        message: 'Bounty not found or not authorized'
      });
    }
    
    const submission = await prisma.bountySubmission.findUnique({
      where: { id: submissionId }
    });
    
    if (!submission || submission.bountyId !== id) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }
    
    // Update submission as winner
    await prisma.bountySubmission.update({
      where: { id: submissionId },
      data: {
        status: 'WINNER',
        wonBountyId: id,
        feedback,
      }
    });
    
    // Update bounty as completed
    await prisma.codeBounty.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      }
    });
    
    // Reject other submissions
    await prisma.bountySubmission.updateMany({
      where: {
        bountyId: id,
        id: { not: submissionId }
      },
      data: { status: 'REJECTED' }
    });
    
    res.json({
      success: true,
      message: 'Winner selected successfully'
    });
  } catch (error) {
    console.error('Error selecting winner:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to select winner'
    });
  }
});

// Get my bounties (created and submissions)
router.get('/my/all', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }
    
    const [created, submissions] = await Promise.all([
      prisma.codeBounty.findMany({
        where: { creatorId: userId },
        include: {
          _count: { select: { submissions: true } }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.bountySubmission.findMany({
        where: { submitterId: userId },
        include: {
          bounty: {
            select: { id: true, title: true, status: true, rewardAmount: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);
    
    res.json({
      success: true,
      data: { created, submissions }
    });
  } catch (error) {
    console.error('Error fetching my bounties:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bounties'
    });
  }
});

export default router;
