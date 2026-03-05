import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Get all build in public updates
router.get('/', async (req: Request, res: Response) => {
  try {
    const { type, projectId, userId } = req.query;
    
    const where: any = { isPublic: true };
    
    if (type) where.type = type;
    if (projectId) where.projectId = projectId;
    if (userId) where.userId = userId;
    
    const updates = await prisma.buildInPublic.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            headline: true,
          }
        },
        project: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    
    res.json({
      success: true,
      data: updates
    });
  } catch (error) {
    console.error('Error fetching updates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch updates'
    });
  }
});

// Get update by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const update = await prisma.buildInPublic.findUnique({
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
          }
        },
        project: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
            description: true,
          }
        }
      }
    });
    
    if (!update) {
      return res.status(404).json({
        success: false,
        message: 'Update not found'
      });
    }
    
    res.json({
      success: true,
      data: update
    });
  } catch (error) {
    console.error('Error fetching update:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch update'
    });
  }
});

// Create a build in public update
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
      projectId,
      title,
      content,
      type,
      revenue,
      users,
      mrr,
      customMetrics,
      images,
      links,
      isPublic,
    } = req.body;
    
    if (!title || !content || !type) {
      return res.status(400).json({
        success: false,
        message: 'Title, content, and type are required'
      });
    }
    
    const update = await prisma.buildInPublic.create({
      data: {
        userId,
        projectId,
        title,
        content,
        type,
        revenue,
        users,
        mrr,
        customMetrics,
        images: images || [],
        links: links || [],
        isPublic: isPublic ?? true,
      },
      include: {
        user: {
          select: { id: true, username: true, displayName: true, avatar: true }
        },
        project: {
          select: { id: true, name: true, slug: true }
        }
      }
    });
    
    res.status(201).json({
      success: true,
      data: update
    });
  } catch (error) {
    console.error('Error creating update:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create update'
    });
  }
});

// Update a build in public post
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }
    
    const update = await prisma.buildInPublic.findUnique({
      where: { id }
    });
    
    if (!update || update.userId !== userId) {
      return res.status(404).json({
        success: false,
        message: 'Update not found or not authorized'
      });
    }
    
    const {
      title,
      content,
      type,
      revenue,
      users,
      mrr,
      customMetrics,
      images,
      links,
      isPublic,
    } = req.body;
    
    const updated = await prisma.buildInPublic.update({
      where: { id },
      data: {
        title,
        content,
        type,
        revenue,
        users,
        mrr,
        customMetrics,
        images,
        links,
        isPublic,
      }
    });
    
    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update post'
    });
  }
});

// Delete a build in public post
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }
    
    const update = await prisma.buildInPublic.findUnique({
      where: { id }
    });
    
    if (!update || update.userId !== userId) {
      return res.status(404).json({
        success: false,
        message: 'Update not found or not authorized'
      });
    }
    
    await prisma.buildInPublic.delete({
      where: { id }
    });
    
    res.json({
      success: true,
      message: 'Update deleted'
    });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete post'
    });
  }
});

// Like an update (increment likes)
router.post('/:id/like', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }
    
    const update = await prisma.buildInPublic.update({
      where: { id },
      data: {
        likesCount: { increment: 1 }
      }
    });
    
    res.json({
      success: true,
      data: update
    });
  } catch (error) {
    console.error('Error liking update:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to like update'
    });
  }
});

// Get user's build in public timeline
router.get('/user/:username', async (req: Request, res: Response) => {
  try {
    const { username } = req.params;
    
    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true }
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const updates = await prisma.buildInPublic.findMany({
      where: {
        userId: user.id,
        isPublic: true
      },
      include: {
        project: {
          select: { id: true, name: true, slug: true, logo: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({
      success: true,
      data: updates
    });
  } catch (error) {
    console.error('Error fetching user updates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch updates'
    });
  }
});

// Get project's build in public timeline
router.get('/project/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    
    const project = await prisma.project.findUnique({
      where: { slug },
      select: { id: true }
    });
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    const updates = await prisma.buildInPublic.findMany({
      where: {
        projectId: project.id,
        isPublic: true
      },
      include: {
        user: {
          select: { id: true, username: true, displayName: true, avatar: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({
      success: true,
      data: updates
    });
  } catch (error) {
    console.error('Error fetching project updates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch updates'
    });
  }
});

// Get my build in public updates
router.get('/my/updates', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }
    
    const updates = await prisma.buildInPublic.findMany({
      where: { userId },
      include: {
        project: {
          select: { id: true, name: true, slug: true, logo: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({
      success: true,
      data: updates
    });
  } catch (error) {
    console.error('Error fetching my updates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch updates'
    });
  }
});

// Get metrics summary for a project
router.get('/project/:slug/metrics', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    
    const project = await prisma.project.findUnique({
      where: { slug },
      select: { id: true }
    });
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    // Get latest metrics from updates
    const latestRevenueUpdate = await prisma.buildInPublic.findFirst({
      where: {
        projectId: project.id,
        revenue: { not: null }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    const latestUserUpdate = await prisma.buildInPublic.findFirst({
      where: {
        projectId: project.id,
        users: { not: null }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    const latestMrrUpdate = await prisma.buildInPublic.findFirst({
      where: {
        projectId: project.id,
        mrr: { not: null }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    const totalUpdates = await prisma.buildInPublic.count({
      where: { projectId: project.id }
    });
    
    res.json({
      success: true,
      data: {
        latestRevenue: latestRevenueUpdate?.revenue || 0,
        latestUsers: latestUserUpdate?.users || 0,
        latestMrr: latestMrrUpdate?.mrr || 0,
        totalUpdates,
      }
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch metrics'
    });
  }
});

export default router;
