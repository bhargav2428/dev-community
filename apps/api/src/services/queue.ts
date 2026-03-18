import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import { config } from '../config/index.js';

const enableRedis = config.features.redis;

let notificationQueue: any;
let emailQueue: any;
let notificationWorker: Worker | null = null;
let emailWorker: Worker | null = null;

if (enableRedis) {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const connection = new Redis(redisUrl);

  notificationQueue = new Queue('notifications', { connection });
  emailQueue = new Queue('emails', { connection });

  // Notification worker
  notificationWorker = new Worker(
    'notifications',
    async (job) => {
      // Implement notification sending logic here
      // job.data: { userId, message, ... }
    },
    { connection }
  );

  // Email worker
  emailWorker = new Worker(
    'emails',
    async (job) => {
      // Implement email sending logic here
      // job.data: { to, subject, body, ... }
    },
    { connection }
  );
} else {
  const noopQueue = { add: async () => {} };
  notificationQueue = noopQueue;
  emailQueue = noopQueue;
}

export { notificationQueue, emailQueue, notificationWorker, emailWorker };