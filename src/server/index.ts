import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app.js';
import { db } from './db/index.js';

const PORT = Number(process.env.PORT) || 3001;

async function bootstrap() {
  try {
    // Initialize database connection & seed store
    await db.init();

    const app = createApp();
    app.listen(PORT, () => {
      console.log(`-----------------------------------------------------`);
      console.log(` Device Repair Assistant Server Online`);
      console.log(` Port: ${PORT}`);
      console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(` Compression: Gzip/Deflate Enabled`);
      console.log(` Health Check: http://localhost:${PORT}/api/health`);
      console.log(`-----------------------------------------------------`);
    });
  } catch (err) {
    console.error('Fatal initialization error:', err);
    process.exit(1);
  }
}

bootstrap();
