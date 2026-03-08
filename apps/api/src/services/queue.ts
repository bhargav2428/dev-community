import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const connection = new Redis(redisUrl);

export const notificationQueue = new Queue('notifications', { connection });
export const emailQueue = new Queue('emails', { connection });

// Notification worker
export const notificationWorker = new Worker('notifications', async (job) => {
  // Implement notification sending logic here
  // job.data: { userId, message, ... }
}, { connection });

// Email worker
export const emailWorker = new Worker('emails', async (job) => {
  // Implement email sending logic here
  // job.data: { to, subject, body, ... }
}, { connection });
