// User Service
// Handles user profile, skills, experience, and social features

import { prisma } from '../lib/prisma.js';
import mongoClientPromise from '../lib/mongo.js';
import { cache, cacheKeys } from '../lib/redis.js';
import { NotFoundError, ForbiddenError, ConflictError } from '../utils/errors.js';
import type { 
  UpdateProfileInput, 
  AddSkillInput, 
  AddExperienceInput,
  AddEducationInput,
  SearchUsersInput,
} from '../schemas/user.schema.js';
import type { User, Profile, Prisma } from '@prisma/client';

// User with relations type
type UserWithProfile = User & {
  profile: Profile | null;
  skills: Array<{
    skill: { id: string; name: string; category: string };
    level: string;
    yearsOfExp: number | null;
    isPrimary: boolean;
  }>;
  _count: {
    followers: number;
    following: number;
    projects: number;
    posts: number;
  };
};

// Public user data (excludes sensitive fields)
const publicUserSelect = {
  id: true,
  username: true,
  email: true,
  firstName: true,
  lastName: true,
  displayName: true,
  avatar: true,
  coverImage: true,
  bio: true,
  headline: true,
  location: true,
  website: true,
  githubUrl: true,
  linkedinUrl: true,
  twitterUrl: true,
  isVerified: true,
  isOnline: true,
  lastSeenAt: true,
  isAvailableForHire: true,
  isOpenToCollab: true,
  profileVisibility: true,
  reputationScore: true,
  level: true,
  xp: true,
  role: true,
  createdAt: true,
  profile: true,
  skills: {
    include: {
      skill: {
        select: {
          id: true,
          name: true,
          slug: true,
          category: true,
          icon: true,
          color: true,
        },
      },
    },
  },
  _count: {
    select: {
      followers: true,
      following: true,
      projects: true,
      posts: true,
    },
  },
};

class UserService {
  /**
   * Get user by ID
   */
  async getUserById(
    userId: string,
    requesterId?: string
  ): Promise<UserWithProfile | null> {
    // Check cache first
    const cached = await cache.get<UserWithProfile>(cacheKeys.user(userId));
    if (cached) return cached;

    const user = await prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      select: publicUserSelect,
    });

    if (!user) return null;

    // Check visibility
    if (user.profileVisibility === 'PRIVATE' && requesterId !== userId) {
      throw new ForbiddenError('This profile is private');
    }

    // Cache for 5 minutes
    await cache.set(cacheKeys.user(userId), user, 300);

    return user as unknown as UserWithProfile;
  }

  /**
   * Get user by username
   */
  async getUserByUsername(
    username: string,
    requesterId?: string
  ): Promise<UserWithProfile | null> {
    const client = await mongoClientPromise;
    const db = client.db();
    const user = await db.collection('User').findOne({ username, deletedAt: null });

    if (!user) return null;

    // Optionally, fetch related profile, skills, counts, etc. (simplified for now)
    if (user.profileVisibility === 'PRIVATE' && requesterId !== user._id?.toString()) {
      throw new ForbiddenError('This profile is private');
    }

    // Map _id to id for compatibility
    user.id = user._id?.toString();

    return user as unknown as UserWithProfile;
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    data: UpdateProfileInput
  ): Promise<UserWithProfile> {
    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: publicUserSelect,
    });

    // Invalidate cache
    await cache.del(cacheKeys.user(userId));

    return user as unknown as UserWithProfile;
  }

  /**
   * Update extended profile
   */
  async updateExtendedProfile(
    userId: string,
    data: Partial<{
      yearsOfExperience: number;
      currentRole: string;
      company: string;
      timezone: string;
      preferredLanguage: string;
    }>
  ): Promise<Profile> {
    const profile = await prisma.profile.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });

    await cache.del(cacheKeys.user(userId));

    return profile;
  }

  /**
   * Add skill to user
   */
  async addSkill(userId: string, data: AddSkillInput) {
    // Determine skill ID - either provided or look up by name
    let skillId = data.skillId;
    
    if (!skillId && data.skillName) {
      // Find or create skill by name
      let skill = await prisma.skill.findFirst({
        where: { name: { equals: data.skillName, mode: 'insensitive' } },
      });
      
      if (!skill) {
        const slug = data.skillName!.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        skill = await prisma.skill.create({
          data: { name: data.skillName!, slug, category: 'OTHER' },
        });
      }
      skillId = skill.id;
    }
    
    if (!skillId) {
      throw new Error('Either skillId or skillName is required');
    }
    
    // Check if skill already exists
    const existing = await prisma.userSkill.findUnique({
      where: {
        userId_skillId: {
          userId,
          skillId: skillId,
        },
      },
    });

    if (existing) {
      throw new ConflictError('Skill already added to profile');
    }

    const userSkill = await prisma.userSkill.create({
      data: {
        userId,
        skillId: skillId,
        level: data.level,
        yearsOfExp: data.yearsOfExp,
        isPrimary: data.isPrimary,
      },
      include: {
        skill: true,
      },
    });

    await cache.del(cacheKeys.user(userId));

    return userSkill;
  }

  /**
   * Remove skill from user
   */
  async removeSkill(userId: string, skillId: string) {
    await prisma.userSkill.delete({
      where: {
        userId_skillId: {
          userId,
          skillId,
        },
      },
    });

    await cache.del(cacheKeys.user(userId));
  }

  /**
   * Add experience
   */
  async addExperience(userId: string, data: AddExperienceInput) {
    const experience = await prisma.experience.create({
      data: {
        userId,
        ...data,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
      },
    });

    await cache.del(cacheKeys.user(userId));

    return experience;
  }

  /**
   * Update experience
   */
  async updateExperience(
    userId: string,
    experienceId: string,
    data: Partial<AddExperienceInput>
  ) {
    const experience = await prisma.experience.findFirst({
      where: { id: experienceId, userId },
    });

    if (!experience) {
      throw new NotFoundError('Experience not found');
    }

    const updated = await prisma.experience.update({
      where: { id: experienceId },
      data: {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
    });

    await cache.del(cacheKeys.user(userId));

    return updated;
  }

  /**
   * Delete experience
   */
  async deleteExperience(userId: string, experienceId: string) {
    const experience = await prisma.experience.findFirst({
      where: { id: experienceId, userId },
    });

    if (!experience) {
      throw new NotFoundError('Experience not found');
    }

    await prisma.experience.delete({
      where: { id: experienceId },
    });

    await cache.del(cacheKeys.user(userId));
  }

  /**
   * Add education
   */
  async addEducation(userId: string, data: AddEducationInput) {
    const education = await prisma.education.create({
      data: {
        userId,
        ...data,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
      },
    });

    await cache.del(cacheKeys.user(userId));

    return education;
  }

  /**
   * Follow user
   */
  async followUser(followerId: string, followingId: string) {
    if (followerId === followingId) {
      throw new ForbiddenError('You cannot follow yourself');
    }

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: followingId, deletedAt: null },
    });

    if (!targetUser) {
      throw new NotFoundError('User not found');
    }

    // Check if already following
    const existing = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

    if (existing) {
      throw new ConflictError('Already following this user');
    }

    // Create follow relationship
    await prisma.follow.create({
      data: {
        followerId,
        followingId,
      },
    });

    // Create notification
    await prisma.notification.create({
      data: {
        userId: followingId,
        type: 'FOLLOW',
        title: 'New follower',
        message: 'Someone started following you',
        entityType: 'user',
        entityId: followerId,
        actionUrl: `/profile/${followerId}`,
      },
    });

    // Update caches
    await Promise.all([
      cache.del(cacheKeys.user(followerId)),
      cache.del(cacheKeys.user(followingId)),
    ]);
  }

  /**
   * Unfollow user
   */
  async unfollowUser(followerId: string, followingId: string) {
    await prisma.follow.delete({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

    await Promise.all([
      cache.del(cacheKeys.user(followerId)),
      cache.del(cacheKeys.user(followingId)),
    ]);
  }

  /**
   * Get user's followers
   */
  async getFollowers(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [followers, total] = await Promise.all([
      prisma.follow.findMany({
        where: { followingId: userId },
        include: {
          follower: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true,
              headline: true,
              isVerified: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.follow.count({ where: { followingId: userId } }),
    ]);

    return {
      data: followers.map((f) => f.follower),
      total,
      page,
      limit,
    };
  }

  /**
   * Get users that user is following
   */
  async getFollowing(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [following, total] = await Promise.all([
      prisma.follow.findMany({
        where: { followerId: userId },
        include: {
          following: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true,
              headline: true,
              isVerified: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.follow.count({ where: { followerId: userId } }),
    ]);

    return {
      data: following.map((f) => f.following),
      total,
      page,
      limit,
    };
  }

  /**
   * Check if user is following another user
   */
  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const follow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

    return !!follow;
  }

  /**
   * Search users
   */
  async searchUsers(params: SearchUsersInput) {
    const { query, skills, isAvailableForHire, location, page, limit } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      profileVisibility: 'PUBLIC',
      ...(query && {
        OR: [
          { username: { contains: query, mode: 'insensitive' } },
          { displayName: { contains: query, mode: 'insensitive' } },
          { bio: { contains: query, mode: 'insensitive' } },
          { headline: { contains: query, mode: 'insensitive' } },
        ],
      }),
      ...(isAvailableForHire !== undefined && { isAvailableForHire }),
      ...(location && { location: { contains: location, mode: 'insensitive' } }),
      ...(skills && skills.length > 0 && {
        skills: {
          some: {
            skill: {
              slug: { in: skills },
            },
          },
        },
      }),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          displayName: true,
          avatar: true,
          headline: true,
          location: true,
          isVerified: true,
          isAvailableForHire: true,
          reputationScore: true,
          skills: {
            include: { skill: true },
            where: { isPrimary: true },
            take: 5,
          },
          _count: {
            select: { followers: true, projects: true },
          },
        },
        skip,
        take: limit,
        orderBy: { reputationScore: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      data: users,
      total,
      page,
      limit,
    };
  }

  /**
   * Get suggested users to follow
   */
  async getSuggestedUsers(userId: string, limit: number = 10) {
    // Get users with similar skills that the user isn't following
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        skills: { select: { skillId: true } },
        following: { select: { followingId: true } },
      },
    });

    if (!user) throw new NotFoundError('User not found');

    const skillIds = user.skills.map((s) => s.skillId);
    const followingIds = user.following.map((f) => f.followingId);

    const suggestions = await prisma.user.findMany({
      where: {
        id: {
          notIn: [userId, ...followingIds],
        },
        deletedAt: null,
        profileVisibility: 'PUBLIC',
        skills: {
          some: {
            skillId: { in: skillIds },
          },
        },
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatar: true,
        headline: true,
        isVerified: true,
        _count: {
          select: { followers: true },
        },
      },
      orderBy: { reputationScore: 'desc' },
      take: limit,
    });

    return suggestions;
  }

  /**
   * Update user's reputation score
   */
  async updateReputation(userId: string, points: number, reason: string) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        reputationScore: { increment: points },
        xp: { increment: Math.abs(points) },
      },
    });

    // Check for level up
    const newLevel = Math.floor(user.xp / 1000) + 1;
    if (newLevel > user.level) {
      await prisma.user.update({
        where: { id: userId },
        data: { level: newLevel },
      });

      // Create level up notification
      await prisma.notification.create({
        data: {
          userId,
          type: 'ACHIEVEMENT',
          title: 'Level Up!',
          message: `Congratulations! You reached level ${newLevel}`,
        },
      });
    }

    // Log activity
    await prisma.activity.create({
      data: {
        userId,
        type: points > 0 ? 'LEVEL_UP' : 'LEVEL_UP',
        description: reason,
        metadata: { points },
      },
    });

    await cache.del(cacheKeys.user(userId));

    return user;
  }

  /**
   * Get user's activity feed
   */
  async getUserActivity(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [activities, total] = await Promise.all([
      prisma.activity.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.activity.count({ where: { userId } }),
    ]);

    return {
      data: activities,
      total,
      page,
      limit,
    };
  }

  /**
   * Get leaderboard
   */
  async getLeaderboard(
    type: 'reputation' | 'contributions' | 'projects' = 'reputation',
    limit: number = 50
  ) {
    const orderBy: Prisma.UserOrderByWithRelationInput =
      type === 'reputation'
        ? { reputationScore: 'desc' }
        : type === 'contributions'
        ? { contributions: { _count: 'desc' } }
        : { projects: { _count: 'desc' } };

    const users = await prisma.user.findMany({
      where: {
        deletedAt: null,
        profileVisibility: 'PUBLIC',
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatar: true,
        reputationScore: true,
        level: true,
        isVerified: true,
        _count: {
          select: {
            contributions: true,
            projects: true,
          },
        },
      },
      orderBy,
      take: limit,
    });

    return users.map((user, index) => ({
      rank: index + 1,
      ...user,
    }));
  }
}

export const userService = new UserService();
