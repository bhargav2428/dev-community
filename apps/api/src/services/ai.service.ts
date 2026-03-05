// AI Service
// Handles AI-powered features using Groq Cloud API (OpenAI-compatible)
// Controlled by ENABLE_OPENAI feature flag

import OpenAI from 'openai';
import { prisma } from '../lib/prisma.js';
import { cache } from '../lib/redis.js';
import { config } from '../config/index.js';
import { logger } from '../lib/logger.js';

// Initialize Groq client (OpenAI-compatible) only if feature is enabled
const groqClient = config.features.openai && config.groq.apiKey
  ? new OpenAI({
      apiKey: config.groq.apiKey,
      baseURL: config.groq.baseUrl,
    })
  : null;

const GROQ_MODEL = config.groq.model || 'llama-3.3-70b-versatile';

if (!config.features.openai) {
  logger.info('Groq AI disabled (ENABLE_OPENAI=false)');
} else {
  logger.info(`Groq AI enabled with model: ${GROQ_MODEL}`);
}

interface StartupIdea {
  title: string;
  problem: string;
  solution: string;
  targetMarket: string;
  techStack: string[];
  businessModel: string;
  mvpFeatures: string[];
}

interface SkillGap {
  skill: string;
  importance: 'high' | 'medium' | 'low';
  reason: string;
  resources: string[];
}

interface TeamMatch {
  userId: string;
  username: string;
  displayName: string;
  avatar: string | null;
  matchScore: number;
  matchReasons: string[];
  complementarySkills: string[];
}

class AIService {
  private async ensureGroq() {
    if (!config.features.openai) {
      throw new Error('Groq AI is disabled (set ENABLE_OPENAI=true to enable)');
    }
    if (!groqClient) {
      throw new Error('Groq API key not configured');
    }
    return groqClient;
  }

  /**
   * Generate startup idea based on user's skills and interests
   */
  async generateStartupIdea(
    userId: string,
    preferences?: {
      industry?: string;
      problemArea?: string;
      targetAudience?: string;
    }
  ): Promise<StartupIdea> {
    const client = await this.ensureGroq();

    // Get user's skills
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        skills: {
          include: { skill: true },
        },
      },
    });

    const userSkills = user?.skills.map((s) => s.skill.name) || [];

    const prompt = `You are a startup idea generator. Based on the following information, generate a unique and viable startup idea.

User's Skills: ${userSkills.join(', ')}
${preferences?.industry ? `Preferred Industry: ${preferences.industry}` : ''}
${preferences?.problemArea ? `Problem Area of Interest: ${preferences.problemArea}` : ''}
${preferences?.targetAudience ? `Target Audience: ${preferences.targetAudience}` : ''}

Generate a startup idea in the following JSON format:
{
  "title": "Catchy startup name",
  "problem": "Clear problem statement (2-3 sentences)",
  "solution": "How the startup solves this problem (2-3 sentences)",
  "targetMarket": "Who are the target customers",
  "techStack": ["Array of recommended technologies"],
  "businessModel": "How the startup will make money",
  "mvpFeatures": ["List of 4-5 MVP features"]
}

Make the idea innovative, feasible with the user's skills, and market-ready.`;

    try {
      const response = await client.chat.completions.create({
        model: GROQ_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error('No response from Groq');

      return JSON.parse(content) as StartupIdea;
    } catch (error) {
      logger.error('AI startup idea generation failed:', error);
      throw error;
    }
  }

  /**
   * Analyze skill gaps for a user
   */
  async analyzeSkillGaps(
    userId: string,
    targetRole?: string
  ): Promise<SkillGap[]> {
    const client = await this.ensureGroq();

    // Get user's current skills
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        skills: {
          include: { skill: true },
        },
        profile: true,
      },
    });

    const userSkills = user?.skills.map((s) => ({
      name: s.skill.name,
      level: s.level,
      years: s.yearsOfExp,
    }));

    const currentRole = user?.profile?.currentRole || 'Software Developer';
    const target = targetRole || 'Senior Full-Stack Developer';

    const prompt = `You are a career advisor for software developers. Analyze the skill gaps between the user's current skills and their target role.

Current Skills:
${JSON.stringify(userSkills, null, 2)}

Current Role: ${currentRole}
Target Role: ${target}

Identify 5-7 skill gaps and provide recommendations. Return a JSON array:
[
  {
    "skill": "Skill name",
    "importance": "high" | "medium" | "low",
    "reason": "Why this skill is important for the target role",
    "resources": ["List of 2-3 learning resources (courses, books, etc.)"]
  }
]

Focus on practical, in-demand skills that will help the user progress in their career.`;

    try {
      const response = await client.chat.completions.create({
        model: GROQ_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error('No response from Groq');

      const parsed = JSON.parse(content);
      return Array.isArray(parsed) ? parsed : parsed.gaps || [];
    } catch (error) {
      logger.error('AI skill gap analysis failed:', error);
      throw error;
    }
  }

  /**
   * Review and improve resume
   */
  async reviewResume(
    resumeText: string,
    targetRole?: string
  ): Promise<{
    score: number;
    strengths: string[];
    improvements: string[];
    suggestions: string[];
    rewrittenSummary?: string;
  }> {
    const client = await this.ensureGroq();

    const prompt = `You are an expert technical resume reviewer. Review the following resume and provide actionable feedback.

Resume:
${resumeText}

${targetRole ? `Target Role: ${targetRole}` : ''}

Provide feedback in this JSON format:
{
  "score": 0-100 (overall resume quality score),
  "strengths": ["List of 3-4 resume strengths"],
  "improvements": ["List of 4-5 specific improvements needed"],
  "suggestions": ["List of 3-4 actionable suggestions"],
  "rewrittenSummary": "An improved professional summary (2-3 sentences)"
}

Be specific and constructive in your feedback. Focus on technical resumes for software developers.`;

    try {
      const response = await client.chat.completions.create({
        model: GROQ_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.6,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error('No response from Groq');

      return JSON.parse(content);
    } catch (error) {
      logger.error('AI resume review failed:', error);
      throw error;
    }
  }

  /**
   * Find matching team members for a project
   */
  async findTeamMatches(
    projectId: string,
    requiredSkills: string[],
    limit: number = 10
  ): Promise<TeamMatch[]> {
    // Get project details
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: { select: { userId: true } },
        skills: { include: { skill: true } },
      },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    const existingMemberIds = project.members.map((m) => m.userId);

    // Find users with matching skills who aren't already members
    const potentialMatches = await prisma.user.findMany({
      where: {
        id: { notIn: existingMemberIds },
        deletedAt: null,
        isOpenToCollab: true,
        skills: {
          some: {
            skill: {
              name: { in: requiredSkills, mode: 'insensitive' },
            },
          },
        },
      },
      include: {
        skills: {
          include: { skill: true },
        },
        _count: {
          select: { projects: true, contributions: true },
        },
      },
      take: limit * 2, // Get more to filter
    });

    // Calculate match scores
    const matches: TeamMatch[] = potentialMatches.map((user) => {
      const userSkillNames = user.skills.map((s) => s.skill.name.toLowerCase());
      const requiredLower = requiredSkills.map((s) => s.toLowerCase());

      // Calculate match score
      const matchingSkills = requiredLower.filter((s) =>
        userSkillNames.includes(s)
      );
      const matchScore = (matchingSkills.length / requiredSkills.length) * 100;

      // Find complementary skills
      const complementarySkills = userSkillNames.filter(
        (s) => !requiredLower.includes(s)
      );

      // Generate match reasons
      const matchReasons: string[] = [];
      if (matchingSkills.length > 0) {
        matchReasons.push(`Has ${matchingSkills.length} required skills: ${matchingSkills.join(', ')}`);
      }
      if (user._count.projects > 0) {
        matchReasons.push(`Active in ${user._count.projects} projects`);
      }
      if (user._count.contributions > 0) {
        matchReasons.push(`${user._count.contributions} contributions`);
      }

      return {
        userId: user.id,
        username: user.username,
        displayName: user.displayName || user.username,
        avatar: user.avatar,
        matchScore: Math.round(matchScore),
        matchReasons,
        complementarySkills: complementarySkills.slice(0, 5),
      };
    });

    // Sort by match score and return top matches
    return matches
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);
  }

  /**
   * Generate project description/summary
   */
  async generateProjectSummary(
    name: string,
    techStack: string[],
    problemStatement?: string
  ): Promise<{
    description: string;
    longDescription: string;
    tagline: string;
  }> {
    const client = await this.ensureGroq();

    const prompt = `Generate a compelling project description for a software project.

Project Name: ${name}
Tech Stack: ${techStack.join(', ')}
${problemStatement ? `Problem Statement: ${problemStatement}` : ''}

Provide in JSON format:
{
  "description": "Short description (1-2 sentences, max 200 chars)",
  "longDescription": "Detailed description (2-3 paragraphs)",
  "tagline": "A catchy tagline (max 50 chars)"
}

Make it engaging and developer-focused.`;

    try {
      const response = await client.chat.completions.create({
        model: GROQ_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error('No response from Groq');

      return JSON.parse(content);
    } catch (error) {
      logger.error('AI project summary generation failed:', error);
      throw error;
    }
  }

  /**
   * Code assistant - explain code or suggest improvements
   */
  async codeAssistant(
    code: string,
    language: string,
    action: 'explain' | 'improve' | 'review' | 'document'
  ): Promise<string> {
    const client = await this.ensureGroq();

    const prompts = {
      explain: `Explain this ${language} code in simple terms, focusing on what it does and how it works:\n\n${code}`,
      improve: `Suggest improvements for this ${language} code, focusing on best practices, performance, and readability:\n\n${code}`,
      review: `Review this ${language} code for potential bugs, security issues, and code quality. Provide specific feedback:\n\n${code}`,
      document: `Generate documentation comments for this ${language} code, following best practices for the language:\n\n${code}`,
    };

    try {
      const response = await client.chat.completions.create({
        model: GROQ_MODEL,
        messages: [{ role: 'user', content: prompts[action] }],
        temperature: 0.5,
      });

      return response.choices[0]?.message?.content || 'No response generated';
    } catch (error) {
      logger.error('AI code assistant failed:', error);
      throw error;
    }
  }

  /**
   * Suggest developers to follow based on interests
   */
  async suggestDevelopersToFollow(userId: string): Promise<string[]> {
    // Get user's skills and interests
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        skills: { include: { skill: true } },
        following: { select: { followingId: true } },
      },
    });

    if (!user) return [];

    const userSkillCategories = [
      ...new Set(user.skills.map((s) => s.skill.category)),
    ];
    const followingIds = user.following.map((f) => f.followingId);

    // Find users with similar skills who aren't followed
    const suggestions = await prisma.user.findMany({
      where: {
        id: { notIn: [userId, ...followingIds] },
        deletedAt: null,
        profileVisibility: 'PUBLIC',
        skills: {
          some: {
            skill: {
              category: { in: userSkillCategories },
            },
          },
        },
      },
      orderBy: { reputationScore: 'desc' },
      take: 10,
      select: { id: true },
    });

    return suggestions.map((s) => s.id);
  }

  /**
   * Generate personalized learning path
   */
  async generateLearningPath(
    userId: string,
    targetSkills: string[]
  ): Promise<{
    path: Array<{
      step: number;
      skill: string;
      duration: string;
      resources: string[];
      projects: string[];
    }>;
  }> {
    const client = await this.ensureGroq();

    // Get user's current skills
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        skills: { include: { skill: true } },
      },
    });

    const currentSkills = user?.skills.map((s) => s.skill.name) || [];

    const prompt = `Create a learning path for a developer.

Current Skills: ${currentSkills.join(', ')}
Target Skills to Learn: ${targetSkills.join(', ')}

Generate a structured learning path in JSON:
{
  "path": [
    {
      "step": 1,
      "skill": "Skill name",
      "duration": "Estimated time to learn (e.g., '2 weeks')",
      "resources": ["List of 2-3 learning resources"],
      "projects": ["List of 2 practice project ideas"]
    }
  ]
}

Order skills from foundational to advanced. Consider prerequisites.`;

    try {
      const response = await client.chat.completions.create({
        model: GROQ_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error('No response from Groq');

      return JSON.parse(content);
    } catch (error) {
      logger.error('AI learning path generation failed:', error);
      throw error;
    }
  }
}

export const aiService = new AIService();
