// Main Express Application Entry Point
import express, { Application, Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import path from 'path';
import { env, config } from './config/index.js';
import { logger } from './lib/logger.js';
import { prisma } from './lib/prisma.js';
import { redis, isRedisAvailable } from './lib/redis.js';

// Import routes
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import projectRoutes from './routes/project.routes.js';
import postRoutes from './routes/post.routes.js';
import aiRoutes from './routes/ai.routes.js';
import messagingRoutes from './routes/messaging.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import ideaRoutes from './routes/idea.routes.js';
import hackathonRoutes from './routes/hackathon.routes.js';
import jobRoutes from './routes/job.routes.js';
import coffeeRoutes from './routes/coffee.routes.js';
import bountyRoutes from './routes/bounty.routes.js';
import skillTreeRoutes from './routes/skillTree.routes.js';
import pairRoutes from './routes/pair.routes.js';
import interviewRoutes from './routes/interview.routes.js';
import mentorRoutes from './routes/mentor.routes.js';
import buildPublicRoutes from './routes/buildPublic.routes.js';
import wrappedRoutes from './routes/wrapped.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import adminRoutes from './routes/admin.routes.js';

// Import middleware
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';

// Import WebSocket handler
import { initializeWebSocket } from './websocket/index.js';

// Create Express app
const app: Application = express();
const httpServer = createServer(app);

// Normalize origins to avoid mismatches from trailing spaces/newlines/slashes in env values.
const normalizeOrigin = (origin: string) => origin.trim().replace(/\/$/, '');
const allowedOrigins = env.CORS_ORIGIN
  .split(',')
  .map(normalizeOrigin)
  .filter(Boolean);
const isAllowedOrigin = (origin?: string) =>
  !origin || allowedOrigins.includes(normalizeOrigin(origin));

// Initialize Socket.io
const io = new SocketServer(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Initialize WebSocket handlers
initializeWebSocket(io);

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: env.NODE_ENV === 'production',
    crossOriginEmbedderPolicy: false,
  })
);

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Compression
app.use(compression());

// Request logging
if (env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  // Custom morgan format for production
  app.use(
    morgan('combined', {
      stream: {
        write: (message: string) => {
          logger.info(message.trim());
        },
      },
    })
  );
}

// Health check endpoint
app.get('/health', async (req: Request, res: Response) => {
  try {
    // Check database connection (MongoDB uses runCommand instead of raw SQL)
    await prisma.$runCommandRaw({ ping: 1 });
    
    // Check Redis connection (optional)
    const redisStatus = config.features.redis 
      ? (isRedisAvailable() ? 'connected' : 'error') 
      : 'disabled';
    if (config.features.redis && redis && isRedisAvailable()) {
      await redis.ping();
    }

    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        redis: redisStatus,
      },
      features: {
        redis: config.features.redis,
        oauthGoogle: config.features.oauthGoogle,
        oauthGithub: config.features.oauthGithub,
        email: config.features.email,
        awsS3: config.features.awsS3,
        openai: config.features.openai,
        elasticsearch: config.features.elasticsearch,
      },
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// API version prefix
const API_PREFIX = '/api/v1';

// Mount routes
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/projects`, projectRoutes);
app.use(`${API_PREFIX}/posts`, postRoutes);
app.use(`${API_PREFIX}/ai`, aiRoutes);
app.use(`${API_PREFIX}/messages`, messagingRoutes);
app.use(`${API_PREFIX}/notifications`, notificationRoutes);
app.use(`${API_PREFIX}/ideas`, ideaRoutes);
app.use(`${API_PREFIX}/hackathons`, hackathonRoutes);
app.use(`${API_PREFIX}/jobs`, jobRoutes);
app.use(`${API_PREFIX}/coffee`, coffeeRoutes);
app.use(`${API_PREFIX}/bounties`, bountyRoutes);
app.use(`${API_PREFIX}/skill-trees`, skillTreeRoutes);
app.use(`${API_PREFIX}/pair`, pairRoutes);
app.use(`${API_PREFIX}/interviews`, interviewRoutes);
app.use(`${API_PREFIX}/mentors`, mentorRoutes);
app.use(`${API_PREFIX}/build-public`, buildPublicRoutes);
app.use(`${API_PREFIX}/wrapped`, wrappedRoutes);
app.use(`${API_PREFIX}/upload`, uploadRoutes);
app.use(`${API_PREFIX}/admin`, adminRoutes);

// Serve uploaded files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// API documentation endpoint
app.get(`${API_PREFIX}`, (req: Request, res: Response) => {
  res.json({
    name: 'DevCommunity API',
    version: '1.0.0',
    description: 'Developer Social Network API',
    documentation: '/api/docs',
    endpoints: {
      auth: `${API_PREFIX}/auth`,
      users: `${API_PREFIX}/users`,
      projects: `${API_PREFIX}/projects`,
      posts: `${API_PREFIX}/posts`,
      ideas: `${API_PREFIX}/ideas`,
      hackathons: `${API_PREFIX}/hackathons`,
      jobs: `${API_PREFIX}/jobs`,
      ai: `${API_PREFIX}/ai`,
      messaging: `${API_PREFIX}/messaging`,
      notifications: `${API_PREFIX}/notifications`,
      coffee: `${API_PREFIX}/coffee`,
      bounties: `${API_PREFIX}/bounties`,
      skillTrees: `${API_PREFIX}/skill-trees`,
      pair: `${API_PREFIX}/pair`,
      interviews: `${API_PREFIX}/interviews`,
      mentors: `${API_PREFIX}/mentors`,
      buildPublic: `${API_PREFIX}/build-public`,
      wrapped: `${API_PREFIX}/wrapped`,
    },
  });
});

// 404 handler for undefined routes
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Graceful shutdown handler
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  // Close HTTP server
  httpServer.close(() => {
    logger.info('HTTP server closed');
  });

  // Close Socket.io
  io.close(() => {
    logger.info('Socket.io closed');
  });

  try {
    // Close database connection
    await prisma.$disconnect();
    logger.info('Database connection closed');

    // Close Redis connection (if available)
    if (redis && isRedisAvailable()) {
      await redis.quit();
      logger.info('Redis connection closed');
    }

    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Unhandled rejection handler
process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit, let the error handler handle it
});

// Uncaught exception handler
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  // Exit on uncaught exception
  process.exit(1);
});

// Start server
const PORT = env.PORT || 3001;

httpServer.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📍 Environment: ${env.NODE_ENV}`);
  logger.info(`📖 API Documentation: http://localhost:${PORT}${API_PREFIX}`);
  logger.info(`🏥 Health Check: http://localhost:${PORT}/health`);
  
  // Log enabled features
  logger.info('📦 Features:');
  logger.info(`   Redis: ${config.features.redis ? '✅ enabled' : '❌ disabled'}`);
  logger.info(`   OAuth Google: ${config.features.oauthGoogle ? '✅ enabled' : '❌ disabled'}`);
  logger.info(`   OAuth GitHub: ${config.features.oauthGithub ? '✅ enabled' : '❌ disabled'}`);
  logger.info(`   Email: ${config.features.email ? '✅ enabled' : '❌ disabled'}`);
  logger.info(`   AWS S3: ${config.features.awsS3 ? '✅ enabled' : '❌ disabled'}`);
  logger.info(`   OpenAI: ${config.features.openai ? '✅ enabled' : '❌ disabled'}`);
  logger.info(`   Elasticsearch: ${config.features.elasticsearch ? '✅ enabled' : '❌ disabled'}`);
});

// Export for testing
export { app, httpServer, io };
