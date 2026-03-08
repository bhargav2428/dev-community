// Project Service
// Handles project CRUD, collaboration, tasks, and team management

import { prisma } from '../lib/prisma.js';
import { NotFoundError, ForbiddenError, ConflictError } from '../utils/errors.js';
import slugify from 'slugify';
import { nanoid } from 'nanoid';
import type { 
  CreateProjectInput, 
  UpdateProjectInput,
  AddTeamMemberInput,
  CreateTaskInput,
  UpdateTaskInput,
  CreateMilestoneInput,
  CreateInvitationInput,
  SearchProjectsInput,
} from '../schemas/project.schema.js';
import type { Prisma, ProjectRole } from '@prisma/client';

// Project with relations
const projectSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  longDescription: true,
  logo: true,
  coverImage: true,
  screenshots: true,
  website: true,
  githubUrl: true,
  demoUrl: true,
  status: true,
  visibility: true,
  stage: true,
  stars: true,
  forks: true,
  views: true,
  isOpenSource: true,
  isRecruiting: true,
  maxTeamSize: true,
  launchedAt: true,
  createdAt: true,
  updatedAt: true,
  owner: {
    select: {
      id: true,
      username: true,
      displayName: true,
      avatar: true,
    },
  },
  members: {
    include: {
      user: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatar: true,
        },
      },
    },
  },
  skills: {
    include: {
      skill: true,
    },
  },
  projectStars: true,
  _count: {
    select: {
      tasks: true,
      milestones: true,
      channels: true,
    },
  },
};

class ProjectService {
    /**
     * Star a project (idempotent, MongoDB)
     */
    async starProject(projectId: string, userId: string) {
      // Check if already starred
      const existing = await prisma.projectStar.findFirst({
        where: { userId, projectId },
      });
      if (existing) {
        return { alreadyStarred: true };
      }
      await prisma.projectStar.create({
        data: { userId, projectId },
      });
      await prisma.project.update({
        where: { id: projectId },
        data: { stars: { increment: 1 } },
      });
      return { alreadyStarred: false };
    }

    /**
     * Unstar a project (idempotent, MongoDB)
     */
    async unstarProject(projectId: string, userId: string) {
      const existing = await prisma.projectStar.findFirst({
        where: { userId, projectId },
      });
      if (!existing) {
        return { alreadyUnstarred: true };
      }
      await prisma.projectStar.delete({
        where: { id: existing.id },
      });
      await prisma.project.update({
        where: { id: projectId },
        data: { stars: { decrement: 1 } },
      });
      return { alreadyUnstarred: false };
    }

    /**
     * Get starred projects for user
     */
    async getStarredProjects(userId: string, limit: number = 20) {
      const stars = await prisma.projectStar.findMany({
        where: { userId },
        include: { project: true },
        take: limit,
      });
      return stars.map((star) => star.project);
    }
  /**
   * Create new project
   */
  async createProject(ownerId: string, data: CreateProjectInput) {
    // Generate unique slug
    let slug = slugify(data.name, { lower: true, strict: true });
    const existingSlug = await prisma.project.findUnique({ where: { slug } });
    if (existingSlug) {
      slug = `${slug}-${nanoid(6)}`;
    }

    const project = await prisma.project.create({
      data: {
        ownerId,
        name: data.name,
        slug,
        description: data.description,
        longDescription: data.longDescription,
        website: data.website,
        githubUrl: data.githubUrl,
        demoUrl: data.demoUrl,
        visibility: data.visibility,
        stage: data.stage,
        isOpenSource: data.isOpenSource,
        isRecruiting: data.isRecruiting,
        maxTeamSize: data.maxTeamSize,
        // Add owner as first member
        members: {
          create: {
            userId: ownerId,
            role: 'OWNER',
            title: 'Founder',
          },
        },
        // Create default channel
        channels: {
          create: {
            name: 'general',
            description: 'General discussion',
            type: 'TEXT',
          },
        },
      },
      select: projectSelect,
    });

    // Add skills if provided
    if (data.skills && data.skills.length > 0) {
      await prisma.projectSkill.createMany({
        data: data.skills.map((skillId) => ({
          projectId: project.id,
          skillId,
        })),
      });
    }

    // Create activity
    await prisma.activity.create({
      data: {
        userId: ownerId,
        type: 'PROJECT_CREATED',
        description: `Created project ${data.name}`,
        entityType: 'project',
        entityId: project.id,
      },
    });

    return project;
  }

  /**
   * Get project by ID
   */
  async getProjectById(projectId: string, requesterId?: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId, deletedAt: null },
      select: projectSelect,
    });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    // Check visibility
    if (project.visibility === 'PRIVATE') {
      const isMember = project.members.some((m) => m.user.id === requesterId);
      if (!isMember) {
        throw new ForbiddenError('This project is private');
      }
    }

    // Increment view count
    await prisma.project.update({
      where: { id: projectId },
      data: { views: { increment: 1 } },
    });

    return project;
  }

  /**
   * Get project by slug
   */
  async getProjectBySlug(slug: string, requesterId?: string) {
    const project = await prisma.project.findUnique({
      where: { slug, deletedAt: null },
      select: projectSelect,
    });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    if (project.visibility === 'PRIVATE') {
      const isMember = project.members.some((m) => m.user.id === requesterId);
      if (!isMember) {
        throw new ForbiddenError('This project is private');
      }
    }

    return project;
  }

  /**
   * Update project
   */
  async updateProject(
    projectId: string,
    userId: string,
    data: UpdateProjectInput
  ) {
    await this.requireProjectRole(projectId, userId, ['OWNER', 'ADMIN']);

    // Extract skills to handle separately
    const { skills, ...updateData } = data;

    // Build the update object
    const prismaData: Prisma.ProjectUpdateInput = {
      ...updateData,
    };

    // If skills are provided, update them
    if (skills !== undefined) {
      prismaData.skills = {
        deleteMany: {},
        create: skills.map(skillId => ({ skillId })),
      };
    }

    const project = await prisma.project.update({
      where: { id: projectId },
      data: prismaData,
      select: projectSelect,
    });

    return project;
  }

  /**
   * Delete project (soft delete)
   */
  async deleteProject(projectId: string, userId: string) {
    await this.requireProjectRole(projectId, userId, ['OWNER']);

    await prisma.project.update({
      where: { id: projectId },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Add team member
   */
  async addTeamMember(
    projectId: string,
    requesterId: string,
    data: AddTeamMemberInput
  ) {
    await this.requireProjectRole(projectId, requesterId, ['OWNER', 'ADMIN']);

    // Check project team size
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { members: true },
    });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    if (
      project.maxTeamSize &&
      project.members.length >= project.maxTeamSize
    ) {
      throw new ForbiddenError('Project team is full');
    }

    // Check if already a member
    const existingMember = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: data.userId,
        },
      },
    });

    if (existingMember) {
      throw new ConflictError('User is already a team member');
    }

    const member = await prisma.projectMember.create({
      data: {
        projectId,
        userId: data.userId,
        role: data.role,
        title: data.title,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
      },
    });

    // Notify user
    await prisma.notification.create({
      data: {
        userId: data.userId,
        type: 'PROJECT_INVITE',
        title: 'Added to project',
        message: `You've been added to ${project.name}`,
        entityType: 'project',
        entityId: projectId,
        actionUrl: `/projects/${project.slug}`,
      },
    });

    // Create activity
    await prisma.activity.create({
      data: {
        userId: data.userId,
        type: 'PROJECT_JOINED',
        description: `Joined project ${project.name}`,
        entityType: 'project',
        entityId: projectId,
      },
    });

    return member;
  }

  /**
   * Remove team member
   */
  async removeTeamMember(
    projectId: string,
    requesterId: string,
    memberId: string
  ) {
    await this.requireProjectRole(projectId, requesterId, ['OWNER', 'ADMIN']);

    const member = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: memberId,
        },
      },
    });

    if (!member) {
      throw new NotFoundError('Team member not found');
    }

    // Can't remove owner
    if (member.role === 'OWNER') {
      throw new ForbiddenError('Cannot remove project owner');
    }

    await prisma.projectMember.delete({
      where: {
        projectId_userId: {
          projectId,
          userId: memberId,
        },
      },
    });
  }

  /**
   * Create task
   */
  async createTask(
    projectId: string,
    userId: string,
    data: CreateTaskInput
  ) {
    await this.requireProjectRole(projectId, userId, ['OWNER', 'ADMIN', 'MEMBER']);

    const task = await prisma.task.create({
      data: {
        projectId,
        reporterId: userId,
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
      },
    });

    // Notify assignee
    if (data.assigneeId && data.assigneeId !== userId) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
      });

      await prisma.notification.create({
        data: {
          userId: data.assigneeId,
          type: 'SYSTEM',
          title: 'Task assigned',
          message: `You've been assigned a task: ${data.title}`,
          entityType: 'task',
          entityId: task.id,
          actionUrl: `/projects/${project?.slug}/tasks`,
        },
      });
    }

    return task;
  }

  /**
   * Update task
   */
  async updateTask(
    projectId: string,
    taskId: string,
    userId: string,
    data: UpdateTaskInput
  ) {
    await this.requireProjectRole(projectId, userId, ['OWNER', 'ADMIN', 'MEMBER']);

    const task = await prisma.task.findFirst({
      where: { id: taskId, projectId },
    });

    if (!task) {
      throw new NotFoundError('Task not found');
    }

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        completedAt: data.status === 'DONE' ? new Date() : undefined,
      },
    });

    return updated;
  }

  /**
   * Get project tasks
   */
  async getProjectTasks(
    projectId: string,
    userId: string,
    filters?: {
      status?: string;
      assigneeId?: string;
      milestoneId?: string;
    }
  ) {
    await this.requireProjectRole(projectId, userId, ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']);

    const tasks = await prisma.task.findMany({
      where: {
        projectId,
        ...(filters?.status && { status: filters.status as any }),
        ...(filters?.assigneeId && { assigneeId: filters.assigneeId }),
        ...(filters?.milestoneId && { milestoneId: filters.milestoneId }),
      },
      orderBy: [{ status: 'asc' }, { priority: 'desc' }, { createdAt: 'desc' }],
    });

    return tasks;
  }

  /**
   * Create milestone
   */
  async createMilestone(
    projectId: string,
    userId: string,
    data: CreateMilestoneInput
  ) {
    await this.requireProjectRole(projectId, userId, ['OWNER', 'ADMIN']);

    const milestone = await prisma.milestone.create({
      data: {
        projectId,
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
      },
    });

    return milestone;
  }

  /**
   * Get project milestones
   */
  async getProjectMilestones(projectId: string, userId: string) {
    await this.requireProjectRole(projectId, userId, ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']);

    const milestones = await prisma.milestone.findMany({
      where: { projectId },
      include: {
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    return milestones;
  }

    // ...existing code...

  /**
   * Create project invitation
   */
  async createInvitation(
    projectId: string,
    inviterId: string,
    data: CreateInvitationInput
  ) {
    await this.requireProjectRole(projectId, inviterId, ['OWNER', 'ADMIN']);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { owner: true },
    });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    const token = nanoid(32);

    const invitation = await prisma.projectInvitation.create({
      data: {
        projectId,
        email: data.email,
        userId: data.userId,
        role: data.role,
        message: data.message,
        token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Send email if email provided
    // emailService.sendProjectInvitation(...)

    return invitation;
  }

  /**
   * Accept invitation
   */
  async acceptInvitation(token: string, userId: string) {
    const invitation = await prisma.projectInvitation.findFirst({
      where: {
        token,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
    });

    if (!invitation) {
      throw new NotFoundError('Invalid or expired invitation');
    }

    // Add user to project
    await prisma.projectMember.create({
      data: {
        projectId: invitation.projectId,
        userId,
        role: invitation.role,
      },
    });

    // Update invitation status
    await prisma.projectInvitation.update({
      where: { id: invitation.id },
      data: { status: 'ACCEPTED' },
    });

    const project = await prisma.project.findUnique({
      where: { id: invitation.projectId },
    });

    return project;
  }

  /**
   * Search projects
   */
  async searchProjects(params: SearchProjectsInput) {
    const {
      query,
      skills,
      stage,
      isRecruiting,
      isOpenSource,
      page,
      limit,
    } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.ProjectWhereInput = {
      deletedAt: null,
      visibility: 'PUBLIC',
      ...(query && {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      }),
      ...(stage && { stage }),
      ...(isRecruiting !== undefined && { isRecruiting }),
      ...(isOpenSource !== undefined && { isOpenSource }),
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

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          logo: true,
          stage: true,
          stars: true,
          isRecruiting: true,
          isOpenSource: true,
          owner: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true,
            },
          },
          skills: {
            include: { skill: true },
            take: 5,
          },
          _count: {
            select: { members: true },
          },
        },
        skip,
        take: limit,
        orderBy: { stars: 'desc' },
      }),
      prisma.project.count({ where }),
    ]);

    return {
      data: projects,
      total,
      page,
      limit,
    };
  }

  /**
   * Get user's projects
   */
  async getUserProjects(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where: {
          deletedAt: null,
          members: {
            some: { userId },
          },
        },
        select: projectSelect,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.project.count({
        where: {
          deletedAt: null,
          members: {
            some: { userId },
          },
        },
      }),
    ]);

    return {
      data: projects,
      total,
      page,
      limit,
    };
  }

  /**
   * Get trending projects
   */
  async getTrendingProjects(limit: number = 10) {
    // Trending: order by number of stars (ProjectStar relation)
    const projects = await prisma.project.findMany({
      where: {
        deletedAt: null,
        visibility: 'PUBLIC',
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        logo: true,
        stage: true,
        stars: true,
        views: true,
        owner: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
        skills: {
          include: { skill: true },
          take: 3,
        },
        projectStars: true,
      },
      orderBy: [
        { stars: 'desc' },
        { views: 'desc' },
      ],
      take: limit,
    });
    return projects;
  }

  /**
   * Helper: Check user role in project
   */
  private async requireProjectRole(
    projectId: string,
    userId: string,
    allowedRoles: ProjectRole[]
  ) {
    const member = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });

    if (!member || !allowedRoles.includes(member.role)) {
      throw new ForbiddenError('You do not have permission to perform this action');
    }

    return member;
  }
}

export const projectService = new ProjectService();
