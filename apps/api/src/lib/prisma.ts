// Prisma Client Singleton
// Ensures single instance of Prisma Client across the application

import { PrismaClient } from '@prisma/client';
import { config } from '../config/index.js';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Create Prisma client with logging based on environment
export const prisma = global.prisma || new PrismaClient({
  log: config.isDevelopment 
    ? ['query', 'error', 'warn'] 
    : ['error'],
});

// Prevent multiple instances in development (hot reload)
if (config.isDevelopment) {
  global.prisma = prisma;
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default prisma;
