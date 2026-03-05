import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Get user's wrapped for a specific year
router.get('/:year', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { year } = req.params;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }
    
    const wrapped = await prisma.developerWrapped.findUnique({
      where: {
        userId_year: {
          userId,
          year: parseInt(year)
        }
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          }
        }
      }
    });
    
    if (!wrapped) {
      return res.status(404).json({
        success: false,
        message: `No wrapped data found for ${year}`
      });
    }
    
    res.json({
      success: true,
      data: wrapped
    });
  } catch (error) {
    console.error('Error fetching wrapped:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch wrapped'
    });
  }
});

// Get public wrapped by username and year
router.get('/user/:username/:year', async (req: Request, res: Response) => {
  try {
    const { username, year } = req.params;
    
    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true, username: true, displayName: true, avatar: true }
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const wrapped = await prisma.developerWrapped.findUnique({
      where: {
        userId_year: {
          userId: user.id,
          year: parseInt(year)
        }
      }
    });
    
    if (!wrapped || !wrapped.isPublic) {
      return res.status(404).json({
        success: false,
        message: 'Wrapped not found or not public'
      });
    }
    
    res.json({
      success: true,
      data: {
        ...wrapped,
        user
      }
    });
  } catch (error) {
    console.error('Error fetching wrapped:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch wrapped'
    });
  }
});

// Generate wrapped for current year
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }
    
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59);
    
    // Check if already generated
    const existing = await prisma.developerWrapped.findUnique({
      where: {
        userId_year: {
          userId,
          year: currentYear
        }
      }
    });
    
    if (existing) {
      return res.json({
        success: true,
        data: existing,
        message: 'Wrapped already generated for this year'
      });
    }
    
    // Gather stats
    const [
      postsCount,
      commentsCount,
      likesGivenCount,
      likesReceivedPosts,
      projectsJoined,
      projectsCreated,
      coffeeChatsCount,
      pairSessionsCount,
      newFollowers,
      newFollowing,
      // badges earned this year
      badgesCount,
      bountiesCompleted
    ] = await Promise.all([
      // Posts created this year
      prisma.post.count({
        where: {
          authorId: userId,
          createdAt: { gte: startOfYear, lte: endOfYear }
        }
      }),
      // Comments this year
      prisma.comment.count({
        where: {
          authorId: userId,
          createdAt: { gte: startOfYear, lte: endOfYear }
        }
      }),
      // Likes given
      prisma.like.count({
        where: {
          userId,
          createdAt: { gte: startOfYear, lte: endOfYear }
        }
      }),
      // Total likes on user's posts this year
      prisma.like.count({
        where: {
          post: { authorId: userId },
          createdAt: { gte: startOfYear, lte: endOfYear }
        }
      }),
      // Projects joined
      prisma.projectMember.count({
        where: {
          userId,
          joinedAt: { gte: startOfYear, lte: endOfYear }
        }
      }),
      // Projects created
      prisma.project.count({
        where: {
          ownerId: userId,
          createdAt: { gte: startOfYear, lte: endOfYear }
        }
      }),
      // Coffee chats participated
      prisma.coffeeChat.count({
        where: {
          OR: [{ hostId: userId }, { guestId: userId }],
          status: 'COMPLETED',
          completedAt: { gte: startOfYear, lte: endOfYear }
        }
      }),
      // Pair sessions
      prisma.pairSession.count({
        where: {
          OR: [{ hostId: userId }, { partnerId: userId }],
          status: 'COMPLETED',
          endedAt: { gte: startOfYear, lte: endOfYear }
        }
      }),
      // New followers
      prisma.follow.count({
        where: {
          followingId: userId,
          createdAt: { gte: startOfYear, lte: endOfYear }
        }
      }),
      // New following
      prisma.follow.count({
        where: {
          followerId: userId,
          createdAt: { gte: startOfYear, lte: endOfYear }
        }
      }),
      // Badges earned
      prisma.userBadge.count({
        where: {
          userId,
          earnedAt: { gte: startOfYear, lte: endOfYear }
        }
      }),
      // Bounties completed
      prisma.bountySubmission.count({
        where: {
          submitterId: userId,
          status: 'WINNER',
          updatedAt: { gte: startOfYear, lte: endOfYear }
        }
      })
    ]);
    
    // Get user's skills
    const userSkills = await prisma.userSkill.findMany({
      where: { userId },
      include: { skill: true },
      orderBy: { endorsements: 'desc' },
      take: 5
    });
    
    const topSkills = userSkills.map(us => us.skill.name);
    
    // Calculate activity patterns
    const posts = await prisma.post.findMany({
      where: {
        authorId: userId,
        createdAt: { gte: startOfYear, lte: endOfYear }
      },
      select: { createdAt: true }
    });
    
    const dayCount: Record<string, number> = {};
    const hourCount: Record<number, number> = {};
    const daysActive = new Set<string>();
    
    posts.forEach(post => {
      const day = post.createdAt.toLocaleDateString('en-US', { weekday: 'long' });
      const hour = post.createdAt.getHours();
      const dateKey = post.createdAt.toISOString().split('T')[0];
      
      dayCount[day] = (dayCount[day] || 0) + 1;
      hourCount[hour] = (hourCount[hour] || 0) + 1;
      daysActive.add(dateKey);
    });
    
    const mostActiveDay = Object.entries(dayCount)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    
    const mostActiveHour = Object.entries(hourCount)
      .sort((a, b) => b[1] - a[1])
      .map(([h]) => parseInt(h))[0] || null;
    
    // Determine developer type based on activity time
    let developerType = 'Night Owl';
    if (mostActiveHour !== null) {
      if (mostActiveHour >= 5 && mostActiveHour < 9) developerType = 'Early Bird';
      else if (mostActiveHour >= 9 && mostActiveHour < 17) developerType = 'Day Coder';
      else if (mostActiveHour >= 17 && mostActiveHour < 21) developerType = 'Evening Hacker';
      else developerType = 'Night Owl';
    }
    
    // Get top post
    const topPost = await prisma.post.findFirst({
      where: {
        authorId: userId,
        createdAt: { gte: startOfYear, lte: endOfYear }
      },
      orderBy: { likesCount: 'desc' }
    });
    
    // Get top project
    const topProject = await prisma.project.findFirst({
      where: {
        ownerId: userId,
        createdAt: { gte: startOfYear, lte: endOfYear }
      },
      orderBy: { stars: 'desc' }
    });
    
    // Get user for XP calculation
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { xp: true, level: true }
    });
    
    // Create wrapped
    const wrapped = await prisma.developerWrapped.create({
      data: {
        userId,
        year: currentYear,
        postsCount,
        commentsCount,
        likesGiven: likesGivenCount,
        likesReceived: likesReceivedPosts,
        projectsJoined,
        projectsCreated,
        coffeeChats: coffeeChatsCount,
        pairSessions: pairSessionsCount,
        followersGained: newFollowers,
        followingAdded: newFollowing,
        skillsLearned: [],
        topSkills,
        skillTreesCompleted: 0,
        badgesEarned: badgesCount,
        xpGained: user?.xp || 0,
        levelsGained: user?.level || 1,
        bountiesCompleted,
        bountyEarnings: 0,
        topPostId: topPost?.id,
        topProjectId: topProject?.id,
        mostActiveDay,
        mostActiveHour,
        longestStreak: 0, // Would need streak calculation
        totalDaysActive: daysActive.size,
        developerType,
        topTags: [],
        isPublic: true,
      }
    });
    
    res.status(201).json({
      success: true,
      data: wrapped
    });
  } catch (error) {
    console.error('Error generating wrapped:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate wrapped'
    });
  }
});

// Update wrapped visibility
router.patch('/:year/visibility', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { year } = req.params;
    const { isPublic } = req.body;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }
    
    const wrapped = await prisma.developerWrapped.findUnique({
      where: {
        userId_year: {
          userId,
          year: parseInt(year)
        }
      }
    });
    
    if (!wrapped) {
      return res.status(404).json({
        success: false,
        message: 'Wrapped not found'
      });
    }
    
    const updated = await prisma.developerWrapped.update({
      where: { id: wrapped.id },
      data: { isPublic }
    });
    
    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    console.error('Error updating visibility:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update visibility'
    });
  }
});

// Get shareable wrapped URL
router.get('/:year/share', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { year } = req.params;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true }
    });
    
    const wrapped = await prisma.developerWrapped.findUnique({
      where: {
        userId_year: {
          userId,
          year: parseInt(year)
        }
      }
    });
    
    if (!wrapped) {
      return res.status(404).json({
        success: false,
        message: 'Wrapped not found'
      });
    }
    
    const shareUrl = `/wrapped/${user?.username}/${year}`;
    
    // Update with share URL if not set
    if (!wrapped.shareUrl) {
      await prisma.developerWrapped.update({
        where: { id: wrapped.id },
        data: { shareUrl }
      });
    }
    
    res.json({
      success: true,
      data: { shareUrl }
    });
  } catch (error) {
    console.error('Error getting share URL:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get share URL'
    });
  }
});

// Get all available wrapped years for user
router.get('/my/years', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }
    
    const wrappedYears = await prisma.developerWrapped.findMany({
      where: { userId },
      select: { year: true, generatedAt: true },
      orderBy: { year: 'desc' }
    });
    
    res.json({
      success: true,
      data: wrappedYears
    });
  } catch (error) {
    console.error('Error fetching wrapped years:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch wrapped years'
    });
  }
});

export default router;
