import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface UploadResult {
  key: string;
  url: string;
  originalName: string;
  size: number;
  mimeType: string;
}

export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/heic',
  'image/heif',
  'image/webp'
];

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export class StorageService {
  private uploadDir: string;

  constructor() {
    this.uploadDir = path.resolve(process.cwd(), process.env.UPLOAD_DIR || 'uploads');
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  validateFile(file: Express.Multer.File): { valid: boolean; error?: string } {
    if (!file) {
      return { valid: false, error: 'No file was provided.' };
    }

    const mime = file.mimetype.toLowerCase();
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    const isAllowedMime = ALLOWED_MIME_TYPES.includes(mime);
    const isAllowedExt = ['jpg', 'jpeg', 'png', 'heic', 'heif', 'webp'].includes(ext);

    if (!isAllowedMime && !isAllowedExt) {
      return {
        valid: false,
        error: 'Unsupported file format. Please upload JPG, PNG, or HEIC images only.'
      };
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return {
        valid: false,
        error: 'File exceeds maximum allowed size of 10 MB.'
      };
    }

    return { valid: true };
  }

  async saveFile(file: Express.Multer.File): Promise<UploadResult> {
    const validation = this.validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const ext = path.extname(file.originalname) || '.jpg';
    const uniqueKey = `dev_${Date.now()}_${crypto.randomBytes(8).toString('hex')}${ext}`;
    const destinationPath = path.join(this.uploadDir, uniqueKey);

    await fs.promises.writeFile(destinationPath, file.buffer);

    return {
      key: uniqueKey,
      url: `/uploads/${uniqueKey}`,
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype
    };
  }

  async deleteFile(key: string): Promise<void> {
    const filePath = path.join(this.uploadDir, path.basename(key));
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  }
}

export const storage = new StorageService();
