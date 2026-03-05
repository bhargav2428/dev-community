// Redis Client Singleton
// Used for caching, sessions, and pub/sub
// Redis is OPTIONAL - controlled by ENABLE_REDIS feature flag

import Redis from 'ioredis';
import { config } from '../config/index.js';
import { logger } from './logger.js';

let redisClient: Redis | null = null;
let isRedisConnected = false;

// Only initialize Redis if feature flag is enabled
if (config.features.redis) {
  try {
    redisClient = new Redis(config.redis.url, {
      maxRetriesPerRequest: 1,
      retryStrategy: (times) => {
        if (times > 1) {
          logger.warn('Redis connection failed - running without cache');
          return null;
        }
        return 500;
      },
      lazyConnect: true,
    });

    redisClient.on('connect', () => {
      isRedisConnected = true;
      logger.info('Redis connected successfully');
    });

    redisClient.on('error', (error) => {
      isRedisConnected = false;
      logger.warn('Redis error (cache disabled):', error.message);
    });

    redisClient.on('close', () => {
      isRedisConnected = false;
      logger.warn('Redis connection closed');
    });

    // Try to connect but don't block
    redisClient.connect().catch(() => {
      logger.warn('Redis not available - running without cache');
      redisClient = null;
    });
  } catch (error) {
    logger.warn('Failed to initialize Redis - running without cache');
    redisClient = null;
  }
} else {
  logger.info('Redis disabled (ENABLE_REDIS=false)');
}

// Export redis instance (can be null)
export const redis = redisClient;
export const isRedisAvailable = () => isRedisConnected && redisClient !== null;

// Cache utilities (gracefully handle when Redis is unavailable)
export const cache = {
  // Get cached value
  async get<T>(key: string): Promise<T | null> {
    if (!redisClient || !isRedisConnected) return null;
    try {
      const data = await redisClient.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  },

  // Set cached value with optional TTL (in seconds)
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    if (!redisClient || !isRedisConnected) return;
    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await redisClient.setex(key, ttl, serialized);
      } else {
        await redisClient.set(key, serialized);
      }
    } catch {
      // Silently fail - cache is optional
    }
  },

  // Delete cached value
  async del(key: string): Promise<void> {
    if (!redisClient || !isRedisConnected) return;
    try {
      await redisClient.del(key);
    } catch {
      // Silently fail
    }
  },

  // Delete by pattern
  async delPattern(pattern: string): Promise<void> {
    if (!redisClient || !isRedisConnected) return;
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
    } catch {
      // Silently fail
    }
  },

  // Check if key exists
  async exists(key: string): Promise<boolean> {
    if (!redisClient || !isRedisConnected) return false;
    try {
      return (await redisClient.exists(key)) === 1;
    } catch {
      return false;
    }
  },

  // Increment counter
  async incr(key: string): Promise<number> {
    if (!redisClient || !isRedisConnected) return 0;
    try {
      return redisClient.incr(key);
    } catch {
      return 0;
    }
  },

  // Set expiration
  async expire(key: string, seconds: number): Promise<void> {
    if (!redisClient || !isRedisConnected) return;
    try {
      await redisClient.expire(key, seconds);
    } catch {
      // Silently fail
    }
  },
};

// Cache key generators
export const cacheKeys = {
  user: (id: string) => `user:${id}`,
  userProfile: (id: string) => `user:${id}:profile`,
  userSession: (token: string) => `session:${token}`,
  post: (id: string) => `post:${id}`,
  feed: (userId: string, page: number) => `feed:${userId}:${page}`,
  trending: (type: string) => `trending:${type}`,
  search: (query: string) => `search:${query}`,
  rateLimit: (ip: string, endpoint: string) => `ratelimit:${ip}:${endpoint}`,
};

export default redis;
