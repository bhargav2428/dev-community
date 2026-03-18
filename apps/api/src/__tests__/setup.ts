// Test Setup File
import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-minimum-32-characters-long';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-minimum-32-characters';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.DATABASE_URL = 'mongodb://localhost:27017/devconnect_test';
process.env.PORT = '4001';
process.env.API_URL = 'http://localhost:4001';
process.env.CLIENT_URL = 'http://localhost:3000';
process.env.ENABLE_REDIS = 'false';
process.env.ENABLE_OPENAI = 'false';
process.env.ENABLE_EMAIL = 'false';

// Mock Prisma
vi.mock('../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    post: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    project: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    notification: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
    refreshToken: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
    verificationToken: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
    oauthAccount: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
    coffeeChat: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    codeBounty: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    skillTree: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    pairSession: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    mockInterview: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    mentorProfile: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    buildInPublic: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    developerWrapped: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    startupIdea: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    hackathon: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    job: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback({
      user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    })),
  },
}));

// Mock Redis
vi.mock('../lib/redis', () => ({
  cache: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    exists: vi.fn(),
  },
  redis: null,
}));

// Mock Logger
vi.mock('../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Global test hooks
beforeAll(async () => {
  console.log('🧪 Starting test suite...');
});

afterAll(async () => {
  console.log('✅ Test suite completed');
});

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.resetAllMocks();
});

// Test utilities
export const createMockUser = (overrides = {}) => ({
  id: 'test-user-id-123',
  email: 'test@example.com',
  username: 'testuser',
  passwordHash: '$2a$10$hashedpassword',
  displayName: 'Test User',
  role: 'USER',
  isVerified: true,
  emailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockPost = (overrides = {}) => ({
  id: 'test-post-id-123',
  authorId: 'test-user-id-123',
  content: 'Test post content',
  type: 'TEXT',
  visibility: 'PUBLIC',
  likesCount: 0,
  commentsCount: 0,
  sharesCount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockProject = (overrides = {}) => ({
  id: 'test-project-id-123',
  ownerId: 'test-user-id-123',
  name: 'Test Project',
  slug: 'test-project',
  description: 'Test project description',
  status: 'ACTIVE',
  visibility: 'PUBLIC',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockCoffeeChat = (overrides = {}) => ({
  id: 'test-coffee-id-123',
  hostId: 'test-user-id-123',
  title: 'Coffee Chat',
  description: 'Let us chat!',
  topics: ['Career', 'Tech'],
  scheduledAt: new Date(Date.now() + 86400000),
  duration: 30,
  status: 'SCHEDULED',
  createdAt: new Date(),
  ...overrides,
});

export const createMockBounty = (overrides = {}) => ({
  id: 'test-bounty-id-123',
  creatorId: 'test-user-id-123',
  title: 'Fix Bug',
  description: 'Fix this bug please',
  rewardType: 'CASH',
  rewardAmount: 100,
  currency: 'USD',
  difficulty: 'MEDIUM',
  status: 'OPEN',
  deadline: new Date(Date.now() + 604800000),
  createdAt: new Date(),
  ...overrides,
});

export const createMockToken = () => ({
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
});
