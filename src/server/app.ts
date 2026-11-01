import express, { Express } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import path from 'path';
import fs from 'fs';

import authRouter from './routes/auth.js';
import uploadRouter from './routes/upload.js';
import catalogRouter from './routes/catalog.js';
import estimateRouter from './routes/estimate.js';
import replacementRouter from './routes/replacements.js';
import billRouter from './routes/bill.js';
import bidsRouter from './routes/bids.js';
import paymentRouter from './routes/payment.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimiter.js';

export function createApp(): Express {
  const app = express();
  app.set('trust proxy', 1);

  // 1. Performance: Enable gzip / deflate compression for scale
  app.use(compression());

  // 2. Request Parsers & Security
  app.use(express.json({ limit: '12mb' }));
  app.use(express.urlencoded({ extended: true, limit: '12mb' }));
  app.use(cookieParser());

  // 3. CORS configuration
  app.use(
    cors({
      origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
      credentials: true
    })
  );

  // 4. General API Rate Limiter
  app.use('/api', apiLimiter);

  // 5. Static File Serving with HTTP Caching headers
  const uploadDir = path.resolve(process.cwd(), process.env.UPLOAD_DIR || 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  app.use(
    '/uploads',
    express.static(uploadDir, {
      maxAge: '7d',
      setHeaders: (res) => {
        res.setHeader('Cache-Control', 'public, max-age=604800');
      }
    })
  );

  // 6. Health Check Endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  });

  // 7. Mount API Routes
  app.use('/api/auth', authRouter);
  app.use('/api/uploads', uploadRouter);
  app.use('/api/catalog', catalogRouter);
  app.use('/api/estimate', estimateRouter);
  app.use('/api/replacements', replacementRouter);
  app.use('/api/bill', billRouter);
  app.use('/api/bids', bidsRouter);
  app.use('/api/payment', paymentRouter);

  // 8. Serve built frontend in production mode
  const distDir = path.resolve(process.cwd(), 'dist');
  if (fs.existsSync(distDir)) {
    app.use(
      express.static(distDir, {
        maxAge: '1y',
        immutable: true,
        index: false,
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('.html')) {
            // Never cache index.html to guarantee SPA asset updates
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          }
        }
      })
    );

    // Fallback to index.html for client-side routing
    app.get('*', (req, res, next) => {
      if (req.originalUrl.startsWith('/api') || req.originalUrl.startsWith('/uploads')) {
        return next();
      }
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  // 9. Central Error Handler
  app.use(errorHandler);

  return app;
}
