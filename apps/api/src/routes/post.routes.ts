// Post/Feed Routes
import { Router } from 'express';
import { postService } from '../services/post.service.js';
import { sendSuccess, sendCreated, sendPaginated, sendNoContent } from '../utils/response.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import { authenticate, optionalAuth } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createPostSchema,
  updatePostSchema,
  createCommentSchema,
  getFeedSchema,
} from '../schemas/post.schema.js';

const router = Router();

// Get all posts (alias for /feed)
router.get(
  '/',
  optionalAuth,
  validate(getFeedSchema, 'query'),
  asyncHandler(async (req, res) => {
    const result = await postService.getFeed(req.user?.id, req.query as any);
    sendPaginated(res, result.data, {
      page: result.page,
      limit: result.limit,
      total: result.total,
    });
  })
);

// Get feed
router.get(
  '/feed',
  optionalAuth,
  validate(getFeedSchema, 'query'),
  asyncHandler(async (req, res) => {
    const result = await postService.getFeed(req.user?.id, req.query as any);
    sendPaginated(res, result.data, {
      page: result.page,
      limit: result.limit,
      total: result.total,
    });
  })
);

// Get trending tags
router.get(
  '/tags/trending',
  asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 20;
    const tags = await postService.getTrendingTags(limit);
    sendSuccess(res, tags);
  })
);

// Get trending topics (alias for trending tags)
router.get(
  '/trending/topics',
  asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 10;
    const tags = await postService.getTrendingTags(limit);
    sendSuccess(res, tags);
  })
);

// Get posts by tag
router.get(
  '/tags/:slug',
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await postService.getPostsByTag(req.params.slug, page, limit);
    sendSuccess(res, result);
  })
);

// Get user's bookmarks
router.get(
  '/bookmarks',
  authenticate,
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await postService.getBookmarkedPosts(req.user!.id, page, limit);
    sendPaginated(res, result.data, {
      page: result.page,
      limit: result.limit,
      total: result.total,
    });
  })
);

// Create post
router.post(
  '/',
  authenticate,
  validate(createPostSchema),
  asyncHandler(async (req, res) => {
    const post = await postService.createPost(req.user!.id, req.body);
    sendCreated(res, post, 'Post created');
  })
);

// Get post by ID
router.get(
  '/:id',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const post = await postService.getPostById(req.params.id, req.user?.id);
    sendSuccess(res, post);
  })
);

// Update post
router.patch(
  '/:id',
  authenticate,
  validate(updatePostSchema),
  asyncHandler(async (req, res) => {
    const post = await postService.updatePost(req.params.id, req.user!.id, req.body);
    sendSuccess(res, post, 'Post updated');
  })
);

// Delete post
router.delete(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    await postService.deletePost(req.params.id, req.user!.id);
    sendNoContent(res);
  })
);

// Like/Unlike post
router.post(
  '/:id/like',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await postService.likePost(req.params.id, req.user!.id);
    sendSuccess(res, result);
  })
);

// Bookmark/Unbookmark post
router.post(
  '/:id/bookmark',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await postService.bookmarkPost(req.params.id, req.user!.id);
    sendSuccess(res, result);
  })
);

// Comments
router.get(
  '/:id/comments',
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await postService.getPostComments(req.params.id, page, limit);
    sendPaginated(res, result.data, {
      page: result.page,
      limit: result.limit,
      total: result.total,
    });
  })
);

router.post(
  '/:id/comments',
  authenticate,
  validate(createCommentSchema),
  asyncHandler(async (req, res) => {
    const comment = await postService.createComment(
      req.params.id,
      req.user!.id,
      req.body
    );
    sendCreated(res, comment, 'Comment added');
  })
);

router.delete(
  '/comments/:commentId',
  authenticate,
  asyncHandler(async (req, res) => {
    await postService.deleteComment(req.params.commentId, req.user!.id);
    sendNoContent(res);
  })
);

// Get user's posts
router.get(
  '/user/:userId',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await postService.getUserPosts(
      req.params.userId,
      req.user?.id,
      page,
      limit
    );
    sendPaginated(res, result.data, {
      page: result.page,
      limit: result.limit,
      total: result.total,
    });
  })
);

export default router;
