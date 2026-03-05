// Post Service
// Handles social feed posts, comments, likes, and engagement

import { prisma } from '../lib/prisma.js';
import { cache, cacheKeys } from '../lib/redis.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';
import type {
  CreatePostInput,
  UpdatePostInput,
  CreateCommentInput,
  GetFeedInput,
} from '../schemas/post.schema.js';
import type { Prisma } from '@prisma/client';

// Post with relations
const postSelect = {
  id: true,
  content: true,
  type: true,
  images: true,
  video: true,
  linkPreview: true,
  visibility: true,
  isPinned: true,
  likesCount: true,
  commentsCount: true,
  sharesCount: true,
  viewsCount: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  author: {
    select: {
      id: true,
      username: true,
      displayName: true,
      avatar: true,
      headline: true,
      isVerified: true,
    },
  },
  project: {
    select: {
      id: true,
      name: true,
      slug: true,
      logo: true,
    },
  },
  tags: {
    include: {
      tag: true,
    },
  },
};

class PostService {
  /**
   * Create a new post
   */
  async createPost(authorId: string, data: CreatePostInput) {
    const post = await prisma.post.create({
      data: {
        authorId,
        content: data.content,
        type: data.type,
        images: data.images || [],
        video: data.video,
        projectId: data.projectId,
        visibility: data.visibility,
      },
      select: postSelect,
    });

    // Add tags if provided
    if (data.tags && data.tags.length > 0) {
      for (const tagName of data.tags) {
        // Find or create tag
        const tag = await prisma.tag.upsert({
          where: { name: tagName.toLowerCase() },
          update: { postsCount: { increment: 1 } },
          create: {
            name: tagName.toLowerCase(),
            slug: tagName.toLowerCase().replace(/\s+/g, '-'),
          },
        });

        await prisma.postTag.create({
          data: {
            postId: post.id,
            tagId: tag.id,
          },
        });
      }
    }

    // Create activity
    await prisma.activity.create({
      data: {
        userId: authorId,
        type: 'POSTED',
        description: 'Created a new post',
        entityType: 'post',
        entityId: post.id,
      },
    });

    // Update reputation
    await prisma.user.update({
      where: { id: authorId },
      data: {
        reputationScore: { increment: 5 },
        xp: { increment: 10 },
      },
    });

    // Invalidate feed caches
    await cache.delPattern('feed:*');

    return post;
  }

  /**
   * Get post by ID
   */
  async getPostById(postId: string, requesterId?: string) {
    const post = await prisma.post.findUnique({
      where: { id: postId, deletedAt: null },
      select: {
        ...postSelect,
        likes: requesterId
          ? {
              where: { userId: requesterId },
              select: { id: true },
            }
          : false,
        bookmarks: requesterId
          ? {
              where: { userId: requesterId },
              select: { id: true },
            }
          : false,
      },
    });

    if (!post) {
      throw new NotFoundError('Post not found');
    }

    // Check visibility
    if (post.visibility === 'PRIVATE' && post.author.id !== requesterId) {
      throw new ForbiddenError('This post is private');
    }

    // Increment view count
    await prisma.post.update({
      where: { id: postId },
      data: { viewsCount: { increment: 1 } },
    });

    return {
      ...post,
      isLiked: requesterId ? (post as any).likes?.length > 0 : false,
      isBookmarked: requesterId ? (post as any).bookmarks?.length > 0 : false,
    };
  }

  /**
   * Update post
   */
  async updatePost(postId: string, userId: string, data: UpdatePostInput) {
    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundError('Post not found');
    }

    if (post.authorId !== userId) {
      throw new ForbiddenError('You can only edit your own posts');
    }

    const updated = await prisma.post.update({
      where: { id: postId },
      data,
      select: postSelect,
    });

    return updated;
  }

  /**
   * Delete post (soft delete)
   */
  async deletePost(postId: string, userId: string) {
    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundError('Post not found');
    }

    if (post.authorId !== userId) {
      throw new ForbiddenError('You can only delete your own posts');
    }

    await prisma.post.update({
      where: { id: postId },
      data: { deletedAt: new Date() },
    });

    await cache.delPattern('feed:*');
  }

  /**
   * Get feed posts
   */
  async getFeed(userId: string | undefined, params: GetFeedInput) {
    const { page, limit, filter, type } = params;
    const skip = (page - 1) * limit;

    // Build where clause based on filter
    let where: Prisma.PostWhereInput = {
      deletedAt: null,
      isApproved: true,
      visibility: 'PUBLIC',
      ...(type && { type }),
    };

    if (filter === 'following' && userId) {
      // Get posts from followed users
      const following = await prisma.follow.findMany({
        where: { followerId: userId },
        select: { followingId: true },
      });
      const followingIds = following.map((f) => f.followingId);

      where = {
        ...where,
        authorId: { in: [...followingIds, userId] },
      };
    }

    // Build orderBy based on filter
    let orderBy: Prisma.PostOrderByWithRelationInput[];
    switch (filter) {
      case 'trending':
        orderBy = [
          { likesCount: 'desc' },
          { commentsCount: 'desc' },
          { publishedAt: 'desc' },
        ];
        break;
      case 'recent':
        orderBy = [{ publishedAt: 'desc' }];
        break;
      default:
        // Mix of engagement and recency
        orderBy = [{ publishedAt: 'desc' }];
    }

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        select: {
          ...postSelect,
          likes: userId
            ? {
                where: { userId },
                select: { id: true },
              }
            : false,
          bookmarks: userId
            ? {
                where: { userId },
                select: { id: true },
              }
            : false,
        },
        skip,
        take: limit,
        orderBy,
      }),
      prisma.post.count({ where }),
    ]);

    // Transform posts
    const transformedPosts = posts.map((post) => ({
      ...post,
      isLiked: userId ? (post as any).likes?.length > 0 : false,
      isBookmarked: userId ? (post as any).bookmarks?.length > 0 : false,
      likes: undefined,
      bookmarks: undefined,
    }));

    return {
      data: transformedPosts,
      total,
      page,
      limit,
    };
  }

  /**
   * Like a post
   */
  async likePost(postId: string, userId: string) {
    const post = await prisma.post.findUnique({
      where: { id: postId, deletedAt: null },
    });

    if (!post) {
      throw new NotFoundError('Post not found');
    }

    // Check if already liked
    const existingLike = await prisma.like.findUnique({
      where: {
        userId_postId: {
          userId,
          postId,
        },
      },
    });

    if (existingLike) {
      // Unlike
      await prisma.like.delete({
        where: { id: existingLike.id },
      });

      await prisma.post.update({
        where: { id: postId },
        data: { likesCount: { decrement: 1 } },
      });

      return { liked: false };
    }

    // Like
    await prisma.like.create({
      data: {
        userId,
        postId,
      },
    });

    await prisma.post.update({
      where: { id: postId },
      data: { likesCount: { increment: 1 } },
    });

    // Notify post author (if not self)
    if (post.authorId !== userId) {
      await prisma.notification.create({
        data: {
          userId: post.authorId,
          type: 'LIKE',
          title: 'New like',
          message: 'Someone liked your post',
          entityType: 'post',
          entityId: postId,
          actionUrl: `/posts/${postId}`,
        },
      });

      // Update author reputation
      await prisma.user.update({
        where: { id: post.authorId },
        data: {
          reputationScore: { increment: 1 },
          xp: { increment: 2 },
        },
      });
    }

    return { liked: true };
  }

  /**
   * Bookmark a post
   */
  async bookmarkPost(postId: string, userId: string) {
    const post = await prisma.post.findUnique({
      where: { id: postId, deletedAt: null },
    });

    if (!post) {
      throw new NotFoundError('Post not found');
    }

    const existingBookmark = await prisma.bookmark.findUnique({
      where: {
        userId_postId: {
          userId,
          postId,
        },
      },
    });

    if (existingBookmark) {
      // Remove bookmark
      await prisma.bookmark.delete({
        where: { id: existingBookmark.id },
      });

      return { bookmarked: false };
    }

    // Add bookmark
    await prisma.bookmark.create({
      data: {
        userId,
        postId,
      },
    });

    return { bookmarked: true };
  }

  /**
   * Get user's bookmarked posts
   */
  async getBookmarkedPosts(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [bookmarks, total] = await Promise.all([
      prisma.bookmark.findMany({
        where: { userId },
        include: {
          post: {
            select: postSelect,
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.bookmark.count({ where: { userId } }),
    ]);

    return {
      data: bookmarks.map((b) => b.post),
      total,
      page,
      limit,
    };
  }

  /**
   * Create comment
   */
  async createComment(
    postId: string,
    authorId: string,
    data: CreateCommentInput
  ) {
    const post = await prisma.post.findUnique({
      where: { id: postId, deletedAt: null },
    });

    if (!post) {
      throw new NotFoundError('Post not found');
    }

    const comment = await prisma.comment.create({
      data: {
        postId,
        authorId,
        content: data.content,
        parentId: data.parentId,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            isVerified: true,
          },
        },
      },
    });

    // Update post comment count
    await prisma.post.update({
      where: { id: postId },
      data: { commentsCount: { increment: 1 } },
    });

    // Notify post author (if not self)
    if (post.authorId !== authorId) {
      await prisma.notification.create({
        data: {
          userId: post.authorId,
          type: 'COMMENT',
          title: 'New comment',
          message: 'Someone commented on your post',
          entityType: 'post',
          entityId: postId,
          actionUrl: `/posts/${postId}`,
        },
      });

      // Update author reputation
      await prisma.user.update({
        where: { id: post.authorId },
        data: {
          reputationScore: { increment: 2 },
          xp: { increment: 5 },
        },
      });
    }

    // Notify parent comment author for replies
    if (data.parentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: data.parentId },
      });

      if (parentComment && parentComment.authorId !== authorId) {
        await prisma.notification.create({
          data: {
            userId: parentComment.authorId,
            type: 'COMMENT',
            title: 'New reply',
            message: 'Someone replied to your comment',
            entityType: 'comment',
            entityId: comment.id,
            actionUrl: `/posts/${postId}`,
          },
        });
      }
    }

    return comment;
  }

  /**
   * Get post comments
   */
  async getPostComments(postId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where: {
          postId,
          deletedAt: null,
          parentId: null, // Only top-level comments
        },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true,
              isVerified: true,
            },
          },
          replies: {
            include: {
              author: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                  avatar: true,
                  isVerified: true,
                },
              },
            },
            take: 3, // Show first 3 replies
            orderBy: { createdAt: 'asc' },
          },
          _count: {
            select: { replies: true },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.comment.count({
        where: { postId, deletedAt: null, parentId: null },
      }),
    ]);

    return {
      data: comments,
      total,
      page,
      limit,
    };
  }

  /**
   * Delete comment (soft delete)
   */
  async deleteComment(commentId: string, userId: string) {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundError('Comment not found');
    }

    if (comment.authorId !== userId) {
      throw new ForbiddenError('You can only delete your own comments');
    }

    await prisma.comment.update({
      where: { id: commentId },
      data: { deletedAt: new Date() },
    });

    // Update post comment count
    await prisma.post.update({
      where: { id: comment.postId },
      data: { commentsCount: { decrement: 1 } },
    });
  }

  /**
   * Get user's posts
   */
  async getUserPosts(
    userId: string,
    requesterId?: string,
    page: number = 1,
    limit: number = 20
  ) {
    const skip = (page - 1) * limit;

    const where: Prisma.PostWhereInput = {
      authorId: userId,
      deletedAt: null,
      ...(userId !== requesterId && { visibility: 'PUBLIC' }),
    };

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        select: postSelect,
        skip,
        take: limit,
        orderBy: { publishedAt: 'desc' },
      }),
      prisma.post.count({ where }),
    ]);

    return {
      data: posts,
      total,
      page,
      limit,
    };
  }

  /**
   * Get trending tags
   */
  async getTrendingTags(limit: number = 20) {
    const tags = await prisma.tag.findMany({
      orderBy: { postsCount: 'desc' },
      take: limit,
    });

    return tags;
  }

  /**
   * Get posts by tag
   */
  async getPostsByTag(tagSlug: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const tag = await prisma.tag.findUnique({
      where: { slug: tagSlug },
    });

    if (!tag) {
      throw new NotFoundError('Tag not found');
    }

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where: {
          deletedAt: null,
          visibility: 'PUBLIC',
          tags: {
            some: { tagId: tag.id },
          },
        },
        select: postSelect,
        skip,
        take: limit,
        orderBy: { publishedAt: 'desc' },
      }),
      prisma.post.count({
        where: {
          deletedAt: null,
          visibility: 'PUBLIC',
          tags: {
            some: { tagId: tag.id },
          },
        },
      }),
    ]);

    return {
      tag,
      data: posts,
      total,
      page,
      limit,
    };
  }
}

export const postService = new PostService();
