import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Get all available mentors
router.get('/', async (req: Request, res: Response) => {
  try {
    const { expertise, skill, isPaid, minRate, maxRate } = req.query;
    
    const where: any = { isAvailable: true };
    
    if (expertise) where.expertise = { has: expertise as string };
    if (skill) where.skills = { has: skill as string };
    if (isPaid !== undefined) where.isPaid = isPaid === 'true';
    
    const mentors = await prisma.mentorProfile.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            headline: true,
            location: true,
          }
        }
      },
      orderBy: [
        { rating: 'desc' },
        { totalSessions: 'desc' }
      ],
      take: 50,
    });
    
    res.json({
      success: true,
      data: mentors
    });
  } catch (error) {
    console.error('Error fetching mentors:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch mentors'
    });
  }
});

// Get mentor profile by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const mentor = await prisma.mentorProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            headline: true,
            bio: true,
            location: true,
            githubUrl: true,
            linkedinUrl: true,
          }
        },
        reviews: {
          include: {
            reviewer: {
              select: { id: true, username: true, displayName: true, avatar: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });
    
    if (!mentor) {
      return res.status(404).json({
        success: false,
        message: 'Mentor not found'
      });
    }
    
    res.json({
      success: true,
      data: mentor
    });
  } catch (error) {
    console.error('Error fetching mentor:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch mentor'
    });
  }
});

// Create mentor profile
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }
    
    // Check if already a mentor
    const existing = await prisma.mentorProfile.findUnique({
      where: { userId }
    });
    
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'You already have a mentor profile'
      });
    }
    
    const {
      title,
      bio,
      expertise,
      skills,
      yearsExperience,
      hoursPerWeek,
      timezone,
      isPaid,
      hourlyRate,
      currency,
    } = req.body;
    
    if (!title || !bio || yearsExperience === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Title, bio, and years of experience are required'
      });
    }
    
    const mentor = await prisma.mentorProfile.create({
      data: {
        userId,
        title,
        bio,
        expertise: expertise || [],
        skills: skills || [],
        yearsExperience,
        hoursPerWeek: hoursPerWeek || 5,
        timezone,
        isPaid: isPaid || false,
        hourlyRate,
        currency: currency || 'USD',
        isAvailable: true,
      },
      include: {
        user: {
          select: { id: true, username: true, displayName: true, avatar: true }
        }
      }
    });
    
    res.status(201).json({
      success: true,
      data: mentor
    });
  } catch (error) {
    console.error('Error creating mentor profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create mentor profile'
    });
  }
});

// Update mentor profile
router.put('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }
    
    const mentor = await prisma.mentorProfile.findUnique({
      where: { userId }
    });
    
    if (!mentor) {
      return res.status(404).json({
        success: false,
        message: 'Mentor profile not found'
      });
    }
    
    const {
      title,
      bio,
      expertise,
      skills,
      yearsExperience,
      hoursPerWeek,
      timezone,
      isPaid,
      hourlyRate,
      currency,
      isAvailable,
    } = req.body;
    
    const updated = await prisma.mentorProfile.update({
      where: { id: mentor.id },
      data: {
        title,
        bio,
        expertise,
        skills,
        yearsExperience,
        hoursPerWeek,
        timezone,
        isPaid,
        hourlyRate,
        currency,
        isAvailable,
      }
    });
    
    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    console.error('Error updating mentor profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update mentor profile'
    });
  }
});

// Request mentorship
router.post('/:mentorId/request', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { mentorId } = req.params;
    const { goals, focusAreas } = req.body;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }
    
    const mentor = await prisma.mentorProfile.findUnique({
      where: { id: mentorId }
    });
    
    if (!mentor) {
      return res.status(404).json({
        success: false,
        message: 'Mentor not found'
      });
    }
    
    if (mentor.userId === userId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot request yourself as a mentor'
      });
    }
    
    // Check existing relationship
    const existing = await prisma.mentorRelationship.findUnique({
      where: {
        mentorId_menteeId: {
          mentorId,
          menteeId: userId
        }
      }
    });
    
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'You already have a mentorship with this mentor'
      });
    }
    
    const relationship = await prisma.mentorRelationship.create({
      data: {
        mentorId,
        menteeId: userId,
        goals: goals || [],
        focusAreas: focusAreas || [],
        status: 'PENDING',
      }
    });
    
    res.status(201).json({
      success: true,
      data: relationship
    });
  } catch (error) {
    console.error('Error requesting mentorship:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to request mentorship'
    });
  }
});

// Accept/decline mentorship request
router.post('/relationships/:relationshipId/respond', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { relationshipId } = req.params;
    const { accept } = req.body;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    
    const relationship = await prisma.mentorRelationship.findUnique({
      where: { id: relationshipId },
      include: { mentor: true }
    });
    
    if (!relationship || relationship.mentor.userId !== userId) {
      return res.status(404).json({ success: false, message: 'Relationship not found' });
    }
    
    const updated = await prisma.mentorRelationship.update({
      where: { id: relationshipId },
      data: {
        status: accept ? 'ACTIVE' : 'DECLINED',
        startedAt: accept ? new Date() : null,
      }
    });
    
    // Update mentor's total mentees count
    if (accept) {
      await prisma.mentorProfile.update({
        where: { id: relationship.mentorId },
        data: { totalMentees: { increment: 1 } }
      });
    }
    
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error responding to mentorship:', error);
    res.status(500).json({ success: false, message: 'Failed to respond to mentorship' });
  }
});

// Schedule a mentor session
router.post('/sessions', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { mentorId, title, agenda, scheduledAt, duration, meetingUrl } = req.body;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    
    // Check if there's an active mentorship
    const relationship = await prisma.mentorRelationship.findUnique({
      where: {
        mentorId_menteeId: {
          mentorId,
          menteeId: userId
        }
      }
    });
    
    if (!relationship || relationship.status !== 'ACTIVE') {
      return res.status(400).json({
        success: false,
        message: 'No active mentorship with this mentor'
      });
    }
    
    const session = await prisma.mentorSession.create({
      data: {
        mentorId,
        menteeId: userId,
        title,
        agenda,
        scheduledAt: new Date(scheduledAt),
        duration: duration || 30,
        meetingUrl,
        status: 'SCHEDULED',
      }
    });
    
    res.status(201).json({ success: true, data: session });
  } catch (error) {
    console.error('Error scheduling session:', error);
    res.status(500).json({ success: false, message: 'Failed to schedule session' });
  }
});

// Complete a mentor session
router.post('/sessions/:sessionId/complete', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { sessionId } = req.params;
    const { notes } = req.body;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    
    const session = await prisma.mentorSession.findUnique({
      where: { id: sessionId },
      include: { mentor: true }
    });
    
    if (!session || (session.mentor.userId !== userId && session.menteeId !== userId)) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }
    
    const updated = await prisma.mentorSession.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        notes,
      }
    });
    
    // Update mentor stats
    await prisma.mentorProfile.update({
      where: { id: session.mentorId },
      data: { totalSessions: { increment: 1 } }
    });
    
    // Update relationship sessions count
    await prisma.mentorRelationship.updateMany({
      where: {
        mentorId: session.mentorId,
        menteeId: session.menteeId
      },
      data: { sessionsCompleted: { increment: 1 } }
    });
    
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error completing session:', error);
    res.status(500).json({ success: false, message: 'Failed to complete session' });
  }
});

// Leave a review for a mentor
router.post('/:mentorId/review', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { mentorId } = req.params;
    const { rating, comment, knowledgeRating, communicationRating, helpfulnessRating } = req.body;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    
    // Check if has been mentored by this mentor
    const relationship = await prisma.mentorRelationship.findUnique({
      where: {
        mentorId_menteeId: {
          mentorId,
          menteeId: userId
        }
      }
    });
    
    if (!relationship || relationship.sessionsCompleted < 1) {
      return res.status(400).json({
        success: false,
        message: 'You must complete at least one session to leave a review'
      });
    }
    
    // Check for existing review
    const existing = await prisma.mentorReview.findUnique({
      where: {
        mentorId_reviewerId: {
          mentorId,
          reviewerId: userId
        }
      }
    });
    
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this mentor'
      });
    }
    
    const review = await prisma.mentorReview.create({
      data: {
        mentorId,
        reviewerId: userId,
        rating,
        comment,
        knowledgeRating,
        communicationRating,
        helpfulnessRating,
      }
    });
    
    // Update mentor's average rating
    const allReviews = await prisma.mentorReview.findMany({
      where: { mentorId }
    });
    
    const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
    
    await prisma.mentorProfile.update({
      where: { id: mentorId },
      data: {
        rating: avgRating,
        reviewCount: allReviews.length
      }
    });
    
    res.status(201).json({ success: true, data: review });
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ success: false, message: 'Failed to create review' });
  }
});

// Get my mentor profile
router.get('/my/profile', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    
    const mentor = await prisma.mentorProfile.findUnique({
      where: { userId },
      include: {
        relationships: {
          include: {
            mentee: {
              select: { id: true, username: true, displayName: true, avatar: true }
            }
          }
        },
        sessions: {
          orderBy: { scheduledAt: 'desc' },
          take: 10
        },
        reviews: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });
    
    res.json({
      success: true,
      data: mentor
    });
  } catch (error) {
    console.error('Error fetching my mentor profile:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch mentor profile' });
  }
});

// Get my mentorships (as mentee)
router.get('/my/mentorships', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    
    const mentorships = await prisma.mentorRelationship.findMany({
      where: { menteeId: userId },
      include: {
        mentor: {
          include: {
            user: {
              select: { id: true, username: true, displayName: true, avatar: true, headline: true }
            }
          }
        }
      }
    });
    
    res.json({
      success: true,
      data: mentorships
    });
  } catch (error) {
    console.error('Error fetching my mentorships:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch mentorships' });
  }
});

export default router;
