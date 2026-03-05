// Configuration module for DevConnect API
// Centralizes all environment variables with validation

import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

// Environment schema validation
const envSchema = z.object({
  // Feature Flags
  ENABLE_REDIS: z.string().default('false'),
  ENABLE_OAUTH_GOOGLE: z.string().default('false'),
  ENABLE_OAUTH_GITHUB: z.string().default('false'),
  ENABLE_EMAIL: z.string().default('false'),
  ENABLE_AWS_S3: z.string().default('false'),
  ENABLE_OPENAI: z.string().default('false'),
  ENABLE_ELASTICSEARCH: z.string().default('false'),

  // App
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('4000'),
  API_URL: z.string().url().default('http://localhost:4000'),
  CLIENT_URL: z.string().url().default('http://localhost:3000'),

  // Database
  DATABASE_URL: z.string(),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // OAuth - Google
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().optional(),

  // OAuth - GitHub
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GITHUB_CALLBACK_URL: z.string().optional(),

  // Email
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().optional(),

  // AWS S3
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().default('us-east-1'),
  AWS_S3_BUCKET: z.string().optional(),

  // Groq Cloud (OpenAI-compatible API)
  GROQ_API_KEY: z.string().optional(),
  GROQ_API_URL: z.string().default('https://api.groq.com/openai/v1'),
  GROQ_MODEL: z.string().default('llama-3.3-70b-versatile'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100'),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  // Session
  SESSION_SECRET: z.string().optional(),

  // Elasticsearch
  ELASTICSEARCH_URL: z.string().optional(),
});

// Parse and validate environment variables
const parseEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map((e) => e.path.join('.')).join(', ');
      throw new Error(`Missing or invalid environment variables: ${missingVars}`);
    }
    throw error;
  }
};

const env = parseEnv();

// Helper to parse boolean from string
const toBool = (val: string) => val.toLowerCase() === 'true';

// Export typed configuration object
export const config = {
  env: env.NODE_ENV,
  isProduction: env.NODE_ENV === 'production',
  isDevelopment: env.NODE_ENV === 'development',
  isTest: env.NODE_ENV === 'test',

  // Feature flags
  features: {
    redis: toBool(env.ENABLE_REDIS),
    oauthGoogle: toBool(env.ENABLE_OAUTH_GOOGLE),
    oauthGithub: toBool(env.ENABLE_OAUTH_GITHUB),
    email: toBool(env.ENABLE_EMAIL),
    awsS3: toBool(env.ENABLE_AWS_S3),
    openai: toBool(env.ENABLE_OPENAI),
    elasticsearch: toBool(env.ENABLE_ELASTICSEARCH),
  },

  server: {
    port: parseInt(env.PORT, 10),
    apiUrl: env.API_URL,
    clientUrl: env.CLIENT_URL,
  },

  database: {
    url: env.DATABASE_URL,
  },

  redis: {
    url: env.REDIS_URL,
  },

  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
    refreshSecret: env.JWT_REFRESH_SECRET,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
  },

  oauth: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      callbackUrl: env.GOOGLE_CALLBACK_URL,
    },
    github: {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
      callbackUrl: env.GITHUB_CALLBACK_URL,
    },
  },

  email: {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT ? parseInt(env.SMTP_PORT, 10) : undefined,
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
    from: env.EMAIL_FROM,
  },

  aws: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    region: env.AWS_REGION,
    s3Bucket: env.AWS_S3_BUCKET,
  },

  groq: {
    apiKey: env.GROQ_API_KEY,
    baseUrl: env.GROQ_API_URL,
    model: env.GROQ_MODEL,
  },

  rateLimit: {
    windowMs: parseInt(env.RATE_LIMIT_WINDOW_MS, 10),
    maxRequests: parseInt(env.RATE_LIMIT_MAX_REQUESTS, 10),
  },

  session: {
    secret: env.SESSION_SECRET,
  },

  elasticsearch: {
    url: env.ELASTICSEARCH_URL,
  },
} as const;

export type Config = typeof config;

// Also export the raw env for direct access
export { env };
