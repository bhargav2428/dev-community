import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Get available pair programming sessions
router.get('/', async (req: Request, res: Response) => {
  try {
    const { type, language, framework, status = 'LOOKING' } = req.query;
    
    const where: any = { status };
    
    if (type) where.type = type;
    if (language) where.language = language;
    if (framework) where.framework = framework;
    
    const sessions = await prisma.pairSession.findMany({
      where,
      include: {
        host: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            headline: true,
          }
        },
        partner: {
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
      data: sessions
    });
  } catch (error) {
    console.error('Error fetching pair sessions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pair sessions'
    });
  }
});

// Get session by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const session = await prisma.pairSession.findUnique({
      where: { id },
      include: {
        host: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            headline: true,
            bio: true,
          }
        },
        partner: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            headline: true,
          }
        }
      }
    });
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    res.json({
      success: true,
      data: session
    });
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch session'
    });
  }
});

// Create a pair programming session
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
      language,
      framework,
      projectUrl,
      scheduledAt,
      duration,
      timezone,
      meetingUrl,
      codeUrl,
    } = req.body;
    
    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Title is required'
      });
    }
    
    const session = await prisma.pairSession.create({
      data: {
        hostId: userId,
        title,
        description,
        type: type || 'GENERAL',
        language,
        framework,
        projectUrl,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        duration: duration || 60,
        timezone,
        meetingUrl,
        codeUrl,
        status: 'LOOKING',
      },
      include: {
        host: {
          select: { id: true, username: true, displayName: true, avatar: true }
        }
      }
    });
    
    res.status(201).json({
      success: true,
      data: session
    });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create session'
    });
  }
});

// Join a pair programming session
router.post('/:id/join', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }
    
    const session = await prisma.pairSession.findUnique({
      where: { id }
    });
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    if (session.status !== 'LOOKING') {
      return res.status(400).json({
        success: false,
        message: 'Session is not available for pairing'
      });
    }
    
    if (session.hostId === userId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot join your own session'
      });
    }
    
    const updatedSession = await prisma.pairSession.update({
      where: { id },
      data: {
        partnerId: userId,
        status: 'MATCHED',
      },
      include: {
        host: {
          select: { id: true, username: true, displayName: true, avatar: true }
        },
        partner: {
          select: { id: true, username: true, displayName: true, avatar: true }
        }
      }
    });
    
    res.json({
      success: true,
      data: updatedSession
    });
  } catch (error) {
    console.error('Error joining session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to join session'
    });
  }
});

// Start a pair session
router.post('/:id/start', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const { meetingUrl, codeUrl } = req.body;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    
    const session = await prisma.pairSession.findUnique({ where: { id } });
    
    if (!session || (session.hostId !== userId && session.partnerId !== userId)) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }
    
    const updatedSession = await prisma.pairSession.update({
      where: { id },
      data: {
        status: 'IN_PROGRESS',
        startedAt: new Date(),
        meetingUrl: meetingUrl || session.meetingUrl,
        codeUrl: codeUrl || session.codeUrl,
      }
    });
    
    res.json({ success: true, data: updatedSession });
  } catch (error) {
    console.error('Error starting session:', error);
    res.status(500).json({ success: false, message: 'Failed to start session' });
  }
});

// End a pair session
router.post('/:id/end', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    
    const session = await prisma.pairSession.findUnique({ where: { id } });
    
    if (!session || (session.hostId !== userId && session.partnerId !== userId)) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }
    
    const updatedSession = await prisma.pairSession.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        endedAt: new Date(),
      }
    });
    
    res.json({ success: true, data: updatedSession });
  } catch (error) {
    console.error('Error ending session:', error);
    res.status(500).json({ success: false, message: 'Failed to end session' });
  }
});

// Cancel a pair session
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    
    const session = await prisma.pairSession.findUnique({ where: { id } });
    
    if (!session || session.hostId !== userId) {
      return res.status(404).json({ success: false, message: 'Session not found or not authorized' });
    }
    
    await prisma.pairSession.update({
      where: { id },
      data: { status: 'CANCELLED' }
    });
    
    res.json({ success: true, message: 'Session cancelled' });
  } catch (error) {
    console.error('Error cancelling session:', error);
    res.status(500).json({ success: false, message: 'Failed to cancel session' });
  }
});

// Get my pair sessions
router.get('/my/all', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }
    
    const [hosted, joined] = await Promise.all([
      prisma.pairSession.findMany({
        where: { hostId: userId },
        include: {
          partner: {
            select: { id: true, username: true, displayName: true, avatar: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.pairSession.findMany({
        where: { partnerId: userId },
        include: {
          host: {
            select: { id: true, username: true, displayName: true, avatar: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);
    
    res.json({
      success: true,
      data: { hosted, joined }
    });
  } catch (error) {
    console.error('Error fetching my sessions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sessions'
    });
  }
});

export default router;
