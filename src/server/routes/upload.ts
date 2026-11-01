import { Router, Response } from 'express';
import multer from 'multer';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { uploadLimiter } from '../middleware/rateLimiter.js';
import { storage, MAX_FILE_SIZE_BYTES } from '../storage/index.js';

const router = Router();

// Configure multer with in-memory storage for clean inspection
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES
  }
});

// Protect upload endpoint with auth and rate limiting
router.post(
  '/',
  requireAuth,
  uploadLimiter,
  upload.single('photo'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({
          status: 'error',
          code: 'NO_FILE',
          message: 'No image file was received. Please select a photo of your device.'
        });
        return;
      }

      const result = await storage.saveFile(req.file);

      res.status(201).json({
        status: 'success',
        data: {
          key: result.key,
          url: result.url,
          originalName: result.originalName,
          size: result.size,
          mimeType: result.mimeType
        }
      });
    } catch (err: any) {
      res.status(400).json({
        status: 'error',
        code: 'UPLOAD_FAILED',
        message: err.message || 'Image upload failed. Please verify the format and size.'
      });
    }
  }
);

export default router;
