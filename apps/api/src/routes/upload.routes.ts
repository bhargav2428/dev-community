// Upload Routes - Handle file uploads for messages
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { nanoid } from 'nanoid';
import { sendSuccess, sendCreated } from '../utils/response.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
const messageUploadsDir = path.join(uploadsDir, 'messages');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(messageUploadsDir)) {
  fs.mkdirSync(messageUploadsDir, { recursive: true });
}

// File type validation
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/mp4'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'application/zip',
  'application/x-rar-compressed',
];

const ALL_ALLOWED_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  ...ALLOWED_AUDIO_TYPES,
  ...ALLOWED_VIDEO_TYPES,
  ...ALLOWED_DOCUMENT_TYPES,
];

// Configure multer storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, messageUploadsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueId = nanoid(12);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueId}${ext}`);
  },
});

// File filter
const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (ALL_ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed`));
  }
};

// Multer upload middleware
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max
    files: 10, // Max 10 files at once
  },
});

// Helper to determine message type from mimetype
function getMessageTypeFromMime(mimetype: string): 'IMAGE' | 'AUDIO' | 'VIDEO' | 'FILE' {
  if (ALLOWED_IMAGE_TYPES.includes(mimetype)) return 'IMAGE';
  if (ALLOWED_AUDIO_TYPES.includes(mimetype)) return 'AUDIO';
  if (ALLOWED_VIDEO_TYPES.includes(mimetype)) return 'VIDEO';
  return 'FILE';
}

// All upload routes require authentication
router.use(authenticate);

/**
 * Upload single file
 * POST /api/v1/upload/message
 */
router.post(
  '/message',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.file;
    const baseUrl = process.env.API_URL || `http://localhost:${process.env.PORT || 4000}`;
    const fileUrl = `${baseUrl}/uploads/messages/${file.filename}`;

    const attachment = {
      url: fileUrl,
      filename: file.originalname,
      fileType: file.mimetype,
      fileSize: file.size,
      messageType: getMessageTypeFromMime(file.mimetype),
    };

    return sendCreated(res, attachment, 'File uploaded successfully');
  })
);

/**
 * Upload multiple files
 * POST /api/v1/upload/messages
 */
router.post(
  '/messages',
  upload.array('files', 10),
  asyncHandler(async (req, res) => {
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const baseUrl = process.env.API_URL || `http://localhost:${process.env.PORT || 4000}`;
    
    const attachments = files.map(file => ({
      url: `${baseUrl}/uploads/messages/${file.filename}`,
      filename: file.originalname,
      fileType: file.mimetype,
      fileSize: file.size,
      messageType: getMessageTypeFromMime(file.mimetype),
    }));

    return sendSuccess(res, attachments, 'Files uploaded successfully');
  })
);

/**
 * Get allowed file types
 * GET /api/v1/upload/allowed-types
 */
router.get(
  '/allowed-types',
  asyncHandler(async (_req, res) => {
    return sendSuccess(res, {
      image: ALLOWED_IMAGE_TYPES,
      audio: ALLOWED_AUDIO_TYPES,
      video: ALLOWED_VIDEO_TYPES,
      document: ALLOWED_DOCUMENT_TYPES,
      maxSize: 100 * 1024 * 1024, // 100MB
      maxFiles: 10,
    });
  })
);

export default router;
