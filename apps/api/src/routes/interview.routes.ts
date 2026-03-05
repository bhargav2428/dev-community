import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Get available mock interviews
router.get('/', async (req: Request, res: Response) => {
  try {
    const { type, difficulty, status = 'AVAILABLE' } = req.query;
    
    const where: any = { status };
    
    if (type) where.type = type;
    if (difficulty) where.difficulty = difficulty;
    
    const interviews = await prisma.mockInterview.findMany({
      where,
      include: {
        interviewer: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            headline: true,
          }
        },
        interviewee: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    
    res.json({
      success: true,
      data: interviews
    });
  } catch (error) {
    console.error('Error fetching interviews:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch interviews'
    });
  }
});

// Get interview by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const interview = await prisma.mockInterview.findUnique({
      where: { id },
      include: {
        interviewer: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            headline: true,
            bio: true,
          }
        },
        interviewee: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          }
        },
        feedback: true
      }
    });
    
    if (!interview) {
      return res.status(404).json({
        success: false,
        message: 'Interview not found'
      });
    }
    
    res.json({
      success: true,
      data: interview
    });
  } catch (error) {
    console.error('Error fetching interview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch interview'
    });
  }
});

// Create a mock interview (as interviewer)
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
      type,
      difficulty,
      duration,
      topics,
      skills,
      scheduledAt,
      timezone,
      meetingUrl,
      recordingConsent,
    } = req.body;
    
    if (!title || !type) {
      return res.status(400).json({
        success: false,
        message: 'Title and type are required'
      });
    }
    
    const interview = await prisma.mockInterview.create({
      data: {
        interviewerId: userId,
        title,
        description,
        type,
        difficulty: difficulty || 'MEDIUM',
        duration: duration || 45,
        topics: topics || [],
        skills: skills || [],
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        timezone,
        meetingUrl,
        recordingConsent: recordingConsent || false,
        status: 'AVAILABLE',
      },
      include: {
        interviewer: {
          select: { id: true, username: true, displayName: true, avatar: true }
        }
      }
    });
    
    res.status(201).json({
      success: true,
      data: interview
    });
  } catch (error) {
    console.error('Error creating interview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create interview'
    });
  }
});

// Request to join an interview (as interviewee)
router.post('/:id/request', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }
    
    const interview = await prisma.mockInterview.findUnique({
      where: { id }
    });
    
    if (!interview) {
      return res.status(404).json({
        success: false,
        message: 'Interview not found'
      });
    }
    
    if (interview.status !== 'AVAILABLE') {
      return res.status(400).json({
        success: false,
        message: 'Interview is not available'
      });
    }
    
    if (interview.interviewerId === userId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot be interviewed by yourself'
      });
    }
    
    const updatedInterview = await prisma.mockInterview.update({
      where: { id },
      data: {
        intervieweeId: userId,
        status: 'REQUESTED',
      },
      include: {
        interviewer: {
          select: { id: true, username: true, displayName: true, avatar: true }
        },
        interviewee: {
          select: { id: true, username: true, displayName: true, avatar: true }
        }
      }
    });
    
    res.json({
      success: true,
      data: updatedInterview
    });
  } catch (error) {
    console.error('Error requesting interview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to request interview'
    });
  }
});

// Confirm an interview request
router.post('/:id/confirm', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const { scheduledAt, meetingUrl } = req.body;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    
    const interview = await prisma.mockInterview.findUnique({ where: { id } });
    
    if (!interview || interview.interviewerId !== userId) {
      return res.status(404).json({ success: false, message: 'Interview not found' });
    }
    
    const updatedInterview = await prisma.mockInterview.update({
      where: { id },
      data: {
        status: 'CONFIRMED',
        scheduledAt: scheduledAt ? new Date(scheduledAt) : interview.scheduledAt,
        meetingUrl: meetingUrl || interview.meetingUrl,
      }
    });
    
    res.json({ success: true, data: updatedInterview });
  } catch (error) {
    console.error('Error confirming interview:', error);
    res.status(500).json({ success: false, message: 'Failed to confirm interview' });
  }
});

// Complete an interview
router.post('/:id/complete', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    
    const interview = await prisma.mockInterview.findUnique({ where: { id } });
    
    if (!interview || (interview.interviewerId !== userId && interview.intervieweeId !== userId)) {
      return res.status(404).json({ success: false, message: 'Interview not found' });
    }
    
    const updatedInterview = await prisma.mockInterview.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      }
    });
    
    res.json({ success: true, data: updatedInterview });
  } catch (error) {
    console.error('Error completing interview:', error);
    res.status(500).json({ success: false, message: 'Failed to complete interview' });
  }
});

// Submit feedback for an interview
router.post('/:id/feedback', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const {
      technicalRating,
      communicationRating,
      problemSolvingRating,
      overallRating,
      strengths,
      improvements,
      notes,
      wouldHire,
    } = req.body;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    
    const interview = await prisma.mockInterview.findUnique({ where: { id } });
    
    if (!interview || (interview.interviewerId !== userId && interview.intervieweeId !== userId)) {
      return res.status(404).json({ success: false, message: 'Interview not found' });
    }
    
    // Determine receiver
    const receiverId = interview.interviewerId === userId 
      ? interview.intervieweeId 
      : interview.interviewerId;
    
    if (!receiverId) {
      return res.status(400).json({ success: false, message: 'No one to give feedback to' });
    }
    
    const feedback = await prisma.interviewFeedback.create({
      data: {
        interviewId: id,
        giverId: userId,
        receiverId,
        technicalRating: technicalRating || 3,
        communicationRating: communicationRating || 3,
        problemSolvingRating: problemSolvingRating || 3,
        overallRating: overallRating || 3,
        strengths: strengths || [],
        improvements: improvements || [],
        notes,
        wouldHire,
      }
    });
    
    res.status(201).json({ success: true, data: feedback });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ success: false, message: 'Failed to submit feedback' });
  }
});

// Cancel an interview
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    
    const interview = await prisma.mockInterview.findUnique({ where: { id } });
    
    if (!interview || interview.interviewerId !== userId) {
      return res.status(404).json({ success: false, message: 'Interview not found or not authorized' });
    }
    
    await prisma.mockInterview.update({
      where: { id },
      data: { status: 'CANCELLED' }
    });
    
    res.json({ success: true, message: 'Interview cancelled' });
  } catch (error) {
    console.error('Error cancelling interview:', error);
    res.status(500).json({ success: false, message: 'Failed to cancel interview' });
  }
});

// Get my interviews (given and received)
router.get('/my/all', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }
    
    const [given, received] = await Promise.all([
      prisma.mockInterview.findMany({
        where: { interviewerId: userId },
        include: {
          interviewee: {
            select: { id: true, username: true, displayName: true, avatar: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.mockInterview.findMany({
        where: { intervieweeId: userId },
        include: {
          interviewer: {
            select: { id: true, username: true, displayName: true, avatar: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);
    
    res.json({
      success: true,
      data: { given, received }
    });
  } catch (error) {
    console.error('Error fetching my interviews:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch interviews'
    });
  }
});

export default router;
