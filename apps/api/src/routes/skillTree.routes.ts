import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Get all skill trees
router.get('/', async (req: Request, res: Response) => {
  try {
    const { category } = req.query;
    
    const where: any = {};
    if (category) where.category = category;
    
    const skillTrees = await prisma.skillTree.findMany({
      where,
      include: {
        _count: {
          select: { nodes: true, userProgress: true }
        }
      },
      orderBy: { name: 'asc' }
    });
    
    res.json({
      success: true,
      data: skillTrees
    });
  } catch (error) {
    console.error('Error fetching skill trees:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch skill trees'
    });
  }
});

// Get skill tree by ID with nodes
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    
    const skillTree = await prisma.skillTree.findUnique({
      where: { id },
      include: {
        nodes: {
          orderBy: [{ level: 'asc' }, { position: 'asc' }]
        }
      }
    });
    
    if (!skillTree) {
      return res.status(404).json({
        success: false,
        message: 'Skill tree not found'
      });
    }
    
    // Get user progress if authenticated
    let userProgress = null;
    if (userId) {
      userProgress = await prisma.userSkillTree.findUnique({
        where: {
          userId_treeId: {
            userId,
            treeId: id
          }
        },
        include: {
          nodeProgress: true
        }
      });
    }
    
    res.json({
      success: true,
      data: {
        ...skillTree,
        userProgress
      }
    });
  } catch (error) {
    console.error('Error fetching skill tree:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch skill tree'
    });
  }
});

// Start a skill tree
router.post('/:id/start', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }
    
    // Check if tree exists
    const tree = await prisma.skillTree.findUnique({
      where: { id }
    });
    
    if (!tree) {
      return res.status(404).json({
        success: false,
        message: 'Skill tree not found'
      });
    }
    
    // Check if already started
    const existing = await prisma.userSkillTree.findUnique({
      where: {
        userId_treeId: { userId, treeId: id }
      }
    });
    
    if (existing) {
      return res.json({
        success: true,
        data: existing,
        message: 'Already started this skill tree'
      });
    }
    
    const userTree = await prisma.userSkillTree.create({
      data: {
        userId,
        treeId: id,
        currentXp: 0,
        level: 1,
        nodesUnlocked: 0,
      }
    });
    
    res.status(201).json({
      success: true,
      data: userTree
    });
  } catch (error) {
    console.error('Error starting skill tree:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start skill tree'
    });
  }
});

// Unlock a node in a skill tree
router.post('/:treeId/nodes/:nodeId/unlock', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { treeId, nodeId } = req.params;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }
    
    // Get user's progress on this tree
    const userTree = await prisma.userSkillTree.findUnique({
      where: {
        userId_treeId: { userId, treeId }
      },
      include: {
        nodeProgress: true
      }
    });
    
    if (!userTree) {
      return res.status(400).json({
        success: false,
        message: 'You need to start this skill tree first'
      });
    }
    
    // Get the node
    const node = await prisma.skillNode.findUnique({
      where: { id: nodeId }
    });
    
    if (!node || node.treeId !== treeId) {
      return res.status(404).json({
        success: false,
        message: 'Node not found'
      });
    }
    
    // Check if already unlocked
    const existingProgress = userTree.nodeProgress.find(p => p.nodeId === nodeId);
    if (existingProgress?.isUnlocked) {
      return res.status(400).json({
        success: false,
        message: 'Node already unlocked'
      });
    }
    
    // Check XP requirements
    if (userTree.currentXp < node.xpRequired) {
      return res.status(400).json({
        success: false,
        message: `Not enough XP. Need ${node.xpRequired}, have ${userTree.currentXp}`
      });
    }
    
    // Check prerequisites
    if (node.prerequisiteIds.length > 0) {
      const unlockedNodeIds = userTree.nodeProgress
        .filter(p => p.isUnlocked)
        .map(p => p.nodeId);
      
      const hasAllPrereqs = node.prerequisiteIds.every(prereqId => 
        unlockedNodeIds.includes(prereqId)
      );
      
      if (!hasAllPrereqs) {
        return res.status(400).json({
          success: false,
          message: 'Complete prerequisite nodes first'
        });
      }
    }
    
    // Create or update node progress
    if (existingProgress) {
      await prisma.userNodeProgress.update({
        where: { id: existingProgress.id },
        data: {
          isUnlocked: true,
          unlockedAt: new Date(),
        }
      });
    } else {
      await prisma.userNodeProgress.create({
        data: {
          userTreeId: userTree.id,
          nodeId,
          isUnlocked: true,
          unlockedAt: new Date(),
        }
      });
    }
    
    // Update user tree progress
    await prisma.userSkillTree.update({
      where: { id: userTree.id },
      data: {
        nodesUnlocked: { increment: 1 },
        currentXp: { decrement: node.xpRequired }
      }
    });
    
    res.json({
      success: true,
      message: 'Node unlocked successfully'
    });
  } catch (error) {
    console.error('Error unlocking node:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unlock node'
    });
  }
});

// Add XP to a skill tree
router.post('/:treeId/xp', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { treeId } = req.params;
    const { amount, reason } = req.body;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }
    
    const userTree = await prisma.userSkillTree.findUnique({
      where: {
        userId_treeId: { userId, treeId }
      }
    });
    
    if (!userTree) {
      return res.status(400).json({
        success: false,
        message: 'You need to start this skill tree first'
      });
    }
    
    const updated = await prisma.userSkillTree.update({
      where: { id: userTree.id },
      data: {
        currentXp: { increment: amount }
      }
    });
    
    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    console.error('Error adding XP:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add XP'
    });
  }
});

// Get user's skill tree progress
router.get('/my/progress', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }
    
    const progress = await prisma.userSkillTree.findMany({
      where: { userId },
      include: {
        tree: true,
        nodeProgress: true
      }
    });
    
    res.json({
      success: true,
      data: progress
    });
  } catch (error) {
    console.error('Error fetching progress:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch progress'
    });
  }
});

// Admin: Create a skill tree
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }
    
    const { name, displayName, description, icon, color, category } = req.body;
    
    const skillTree = await prisma.skillTree.create({
      data: {
        name,
        displayName,
        description,
        icon,
        color,
        category,
      }
    });
    
    res.status(201).json({
      success: true,
      data: skillTree
    });
  } catch (error) {
    console.error('Error creating skill tree:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create skill tree'
    });
  }
});

// Admin: Add node to skill tree
router.post('/:treeId/nodes', async (req: Request, res: Response) => {
  try {
    const { treeId } = req.params;
    const { name, description, icon, level, position, xpRequired, prerequisiteIds } = req.body;
    
    const node = await prisma.skillNode.create({
      data: {
        treeId,
        name,
        description,
        icon,
        level: level || 1,
        position: position || 0,
        xpRequired: xpRequired || 100,
        prerequisiteIds: prerequisiteIds || [],
      }
    });
    
    // Update total nodes count
    await prisma.skillTree.update({
      where: { id: treeId },
      data: {
        totalNodes: { increment: 1 },
        totalXp: { increment: xpRequired || 100 }
      }
    });
    
    res.status(201).json({
      success: true,
      data: node
    });
  } catch (error) {
    console.error('Error creating node:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create node'
    });
  }
});

export default router;
