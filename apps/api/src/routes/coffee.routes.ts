import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

// Get all available coffee chats
router.get('/', async (req: Request, res: Response) => {
  try {
    const { topic, language, status = 'AVAILABLE' } = req.query;
    
    const where: any = { status };
    
    if (topic) {
      where.topics = { has: topic as string };
    }
    
    if (language) {
      where.languages = { has: language as string };
    }
    
    const coffeeChats = await prisma.coffeeChat.findMany({
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
        guest: {
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
      data: coffeeChats
    });
  } catch (error) {
    console.error('Error fetching coffee chats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch coffee chats'
    });
  }
});

// Get my coffee chats (hosted and joined)
router.get('/my', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }
    
    const [hosted, joined] = await Promise.all([
      prisma.coffeeChat.findMany({
        where: { hostId: userId },
        include: {
          guest: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.coffeeChat.findMany({
        where: { guestId: userId },
        include: {
          host: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
      })
    ]);
    
    res.json({
      success: true,
      data: { hosted, joined }
    });
  } catch (error) {
    console.error('Error fetching my coffee chats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch coffee chats'
    });
  }
});

// Create a coffee chat availability
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }
    
    const { title, topic, description, topics, languages, duration, scheduledAt, timezone } = req.body;
    
    const coffeeChat = await prisma.coffeeChat.create({
      data: {
        hostId: userId,
        title,
        topic,
        description,
        topics: topics || [],
        languages: languages || [],
        duration: duration || 15,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        timezone,
        status: 'AVAILABLE',
      },
      include: {
        host: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          }
        }
      }
    });
    
    res.status(201).json({
      success: true,
      data: coffeeChat
    });
  } catch (error) {
    console.error('Error creating coffee chat:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create coffee chat'
    });
  }
});

// Join a coffee chat
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
    
    // Check if chat exists and is available
    const chat = await prisma.coffeeChat.findUnique({
      where: { id }
    });
    
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Coffee chat not found'
      });
    }
    
    if (chat.status !== 'AVAILABLE') {
      return res.status(400).json({
        success: false,
        message: 'This coffee chat is no longer available'
      });
    }
    
    if (chat.hostId === userId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot join your own coffee chat'
      });
    }
    
    const updatedChat = await prisma.coffeeChat.update({
      where: { id },
      data: {
        guestId: userId,
        status: 'CONFIRMED',
      },
      include: {
        host: {
          select: { id: true, username: true, displayName: true, avatar: true }
        },
        guest: {
          select: { id: true, username: true, displayName: true, avatar: true }
        }
      }
    });
    
    res.json({
      success: true,
      data: updatedChat
    });
  } catch (error) {
    console.error('Error joining coffee chat:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to join coffee chat'
    });
  }
});

// Complete a coffee chat
router.post('/:id/complete', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    
    const chat = await prisma.coffeeChat.findUnique({ where: { id } });
    
    if (!chat || (chat.hostId !== userId && chat.guestId !== userId)) {
      return res.status(404).json({ success: false, message: 'Coffee chat not found' });
    }
    
    const updatedChat = await prisma.coffeeChat.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      }
    });
    
    res.json({ success: true, data: updatedChat });
  } catch (error) {
    console.error('Error completing coffee chat:', error);
    res.status(500).json({ success: false, message: 'Failed to complete coffee chat' });
  }
});

// Leave feedback for a coffee chat
router.post('/:id/feedback', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const { rating, comment, wouldMeetAgain } = req.body;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    
    const chat = await prisma.coffeeChat.findUnique({ where: { id } });
    
    if (!chat || (chat.hostId !== userId && chat.guestId !== userId)) {
      return res.status(404).json({ success: false, message: 'Coffee chat not found' });
    }
    
    // Determine who receives the feedback
    const receiverId = chat.hostId === userId ? chat.guestId : chat.hostId;
    
    if (!receiverId) {
      return res.status(400).json({ success: false, message: 'No partner to give feedback to' });
    }
    
    const feedback = await prisma.coffeeFeedback.create({
      data: {
        chatId: id,
        giverId: userId,
        receiverId,
        rating,
        comment,
        wouldMeetAgain: wouldMeetAgain ?? true,
      }
    });
    
    res.status(201).json({ success: true, data: feedback });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ success: false, message: 'Failed to submit feedback' });
  }
});

// Cancel a coffee chat
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    
    const chat = await prisma.coffeeChat.findUnique({ where: { id } });
    
    if (!chat || chat.hostId !== userId) {
      return res.status(404).json({ success: false, message: 'Coffee chat not found or not authorized' });
    }
    
    await prisma.coffeeChat.update({
      where: { id },
      data: { status: 'CANCELLED' }
    });
    
    res.json({ success: true, message: 'Coffee chat cancelled' });
  } catch (error) {
    console.error('Error cancelling coffee chat:', error);
    res.status(500).json({ success: false, message: 'Failed to cancel coffee chat' });
  }
});

export default router;
