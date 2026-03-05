// Project Routes
import { Router } from 'express';
import { projectService } from '../services/project.service.js';
import { sendSuccess, sendCreated, sendPaginated, sendNoContent } from '../utils/response.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import { authenticate, optionalAuth } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createProjectSchema,
  updateProjectSchema,
  addTeamMemberSchema,
  createTaskSchema,
  updateTaskSchema,
  createMilestoneSchema,
  createInvitationSchema,
  searchProjectsSchema,
} from '../schemas/project.schema.js';

const router = Router();

// Get all projects (list)
router.get(
  '/',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const owner = req.query.owner as string;
    const starred = req.query.starred === 'true';

    // Handle special filters
    if (owner === 'me' && req.user) {
      const result = await projectService.getUserProjects(req.user.id, page, limit);
      return sendPaginated(res, result.data, {
        page: result.page,
        limit: result.limit,
        total: result.total,
      });
    }

    // Starred projects - return trending for now (until user star tracking is implemented)
    if (starred) {
      const projects = await projectService.getTrendingProjects(limit);
      return sendPaginated(res, projects, {
        page: 1,
        limit,
        total: projects.length,
      });
    }

    // Default: search all projects
    const result = await projectService.searchProjects({ page, limit });
    sendPaginated(res, result.data, {
      page: result.page,
      limit: result.limit,
      total: result.total,
    });
  })
);

// Search projects
router.get(
  '/search',
  optionalAuth,
  validate(searchProjectsSchema, 'query'),
  asyncHandler(async (req, res) => {
    const result = await projectService.searchProjects(req.query as any);
    sendPaginated(res, result.data, {
      page: result.page,
      limit: result.limit,
      total: result.total,
    });
  })
);

// Get trending projects
router.get(
  '/trending',
  asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 10;
    const projects = await projectService.getTrendingProjects(limit);
    sendSuccess(res, projects);
  })
);

// Get user's projects
router.get(
  '/my',
  authenticate,
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await projectService.getUserProjects(req.user!.id, page, limit);
    sendPaginated(res, result.data, {
      page: result.page,
      limit: result.limit,
      total: result.total,
    });
  })
);

// Create project
router.post(
  '/',
  authenticate,
  validate(createProjectSchema),
  asyncHandler(async (req, res) => {
    const project = await projectService.createProject(req.user!.id, req.body);
    sendCreated(res, project, 'Project created successfully');
  })
);

// Get project by slug
router.get(
  '/:slug',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const project = await projectService.getProjectBySlug(
      req.params.slug,
      req.user?.id
    );
    sendSuccess(res, project);
  })
);

// Update project
router.patch(
  '/:id',
  authenticate,
  validate(updateProjectSchema),
  asyncHandler(async (req, res) => {
    const project = await projectService.updateProject(
      req.params.id,
      req.user!.id,
      req.body
    );
    sendSuccess(res, project, 'Project updated');
  })
);

// Delete project
router.delete(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    await projectService.deleteProject(req.params.id, req.user!.id);
    sendNoContent(res);
  })
);

// Star project
router.post(
  '/:id/star',
  authenticate,
  asyncHandler(async (req, res) => {
    await projectService.starProject(req.params.id, req.user!.id);
    sendSuccess(res, null, 'Project starred');
  })
);

// Team members
router.post(
  '/:id/members',
  authenticate,
  validate(addTeamMemberSchema),
  asyncHandler(async (req, res) => {
    const member = await projectService.addTeamMember(
      req.params.id,
      req.user!.id,
      req.body
    );
    sendCreated(res, member, 'Team member added');
  })
);

router.delete(
  '/:id/members/:userId',
  authenticate,
  asyncHandler(async (req, res) => {
    await projectService.removeTeamMember(
      req.params.id,
      req.user!.id,
      req.params.userId
    );
    sendNoContent(res);
  })
);

// Invitations
router.post(
  '/:id/invitations',
  authenticate,
  validate(createInvitationSchema),
  asyncHandler(async (req, res) => {
    const invitation = await projectService.createInvitation(
      req.params.id,
      req.user!.id,
      req.body
    );
    sendCreated(res, invitation, 'Invitation sent');
  })
);

router.post(
  '/invitations/:token/accept',
  authenticate,
  asyncHandler(async (req, res) => {
    const project = await projectService.acceptInvitation(
      req.params.token,
      req.user!.id
    );
    sendSuccess(res, project, 'Invitation accepted');
  })
);

// Tasks
router.get(
  '/:id/tasks',
  authenticate,
  asyncHandler(async (req, res) => {
    const filters = {
      status: req.query.status as string,
      assigneeId: req.query.assigneeId as string,
      milestoneId: req.query.milestoneId as string,
    };
    const tasks = await projectService.getProjectTasks(
      req.params.id,
      req.user!.id,
      filters
    );
    sendSuccess(res, tasks);
  })
);

router.post(
  '/:id/tasks',
  authenticate,
  validate(createTaskSchema),
  asyncHandler(async (req, res) => {
    const task = await projectService.createTask(
      req.params.id,
      req.user!.id,
      req.body
    );
    sendCreated(res, task, 'Task created');
  })
);

router.patch(
  '/:id/tasks/:taskId',
  authenticate,
  validate(updateTaskSchema),
  asyncHandler(async (req, res) => {
    const task = await projectService.updateTask(
      req.params.id,
      req.params.taskId,
      req.user!.id,
      req.body
    );
    sendSuccess(res, task, 'Task updated');
  })
);

// Milestones
router.get(
  '/:id/milestones',
  authenticate,
  asyncHandler(async (req, res) => {
    const milestones = await projectService.getProjectMilestones(
      req.params.id,
      req.user!.id
    );
    sendSuccess(res, milestones);
  })
);

router.post(
  '/:id/milestones',
  authenticate,
  validate(createMilestoneSchema),
  asyncHandler(async (req, res) => {
    const milestone = await projectService.createMilestone(
      req.params.id,
      req.user!.id,
      req.body
    );
    sendCreated(res, milestone, 'Milestone created');
  })
);

export default router;
