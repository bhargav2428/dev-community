// Winston Logger Configuration
// Structured logging for debugging and monitoring

import winston from 'winston';
import { config } from '../config/index.js';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

// Custom log format for development
const devFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  let log = `${timestamp} [${level}]: ${message}`;
  if (Object.keys(meta).length > 0) {
    log += ` ${JSON.stringify(meta)}`;
  }
  if (stack) {
    log += `\n${stack}`;
  }
  return log;
});

// Create Winston logger instance
export const logger = winston.createLogger({
  level: config.isDevelopment ? 'debug' : 'info',
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' })
  ),
  defaultMeta: { service: 'devconnect-api' },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: config.isDevelopment
        ? combine(colorize(), devFormat)
        : combine(json()),
    }),
    // File transport for errors
    ...(config.isProduction
      ? [
          new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            format: json(),
          }),
          new winston.transports.File({
            filename: 'logs/combined.log',
            format: json(),
          }),
        ]
      : []),
  ],
});

// Stream for Morgan HTTP logging
export const httpLogStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

export default logger;
