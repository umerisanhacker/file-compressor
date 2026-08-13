/* =====================================================================
   server.js — DIAMOND-GRADE PRODUCTION SERVER
   
   Architecture:
   • Frontend compresses 100% client-side (privacy-first, no uploads)
   • This server primarily serves static files (index.html, CSS, JS)
   • Optional /api/compress endpoint for edge cases (huge files, API access)
   • Production-ready with security headers, logging, graceful shutdown
   
   Dependencies:
     npm install express cors helmet compression morgan multer sharp dotenv
   
   Run:
     node server.js          → http://localhost:5001
     npm start               → same (if package.json has start script)
   ===================================================================== */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5001;
const NODE_ENV = process.env.NODE_ENV || 'development';

/* =====================================================================
   MIDDLEWARE LAYER — Security, Compression, Logging
   ===================================================================== */

// Security headers (helmet)
app.use(helmet({
  contentSecurityPolicy: NODE_ENV === 'production',
  crossOriginEmbedderPolicy: false
}));

// CORS (allow frontend if served separately, or disable if same-origin)
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Gzip compression for static assets
app.use(compression());

// Request logging (morgan)
app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));

// JSON body parser (for API endpoints)
app.use(express.json({ limit: '10mb' }));

// Static file serving (index.html, style.css, script.js)
app.use(express.static(__dirname, {
  extensions: ['html'],
  maxAge: NODE_ENV === 'production' ? '1d' : 0,
  etag: true
}));

/* =====================================================================
   ROUTES
   ===================================================================== */

// Health check endpoint
app.get('/ping', (req, res) => {
  res.status(200).json({
    status: 'OK',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: NODE_ENV
  });
});

// Serve index.html at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

/* =====================================================================
   OPTIONAL: SERVER-SIDE COMPRESSION API
   
   Note: The frontend compresses images 100% client-side by default.
   This endpoint exists for:
   • Processing files >80MB that exceed browser limits
   • API access from external applications
   • Fallback when client-side compression fails
   
   Usage: POST /api/compress/image (multipart/form-data)
   Body: file (image), targetSize (KB, optional, default 500)
   ===================================================================== */

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB max
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported format. Allowed: JPG, PNG, WebP, GIF'), false);
    }
  }
});

app.post('/api/compress/image', upload.single('file'), async (req, res) => {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`\n[${requestId}] [COMPRESS] Request received`);

  // Validate file
  if (!req.file) {
    console.error(`[${requestId}] [ERROR] No file uploaded`);
    return res.status(400).json({
      error: 'No file detected',
      code: 'NO_FILE'
    });
  }

  const targetSizeKB = Math.min(100000, Math.max(10, parseInt(req.body.targetSize) || 500));
  const targetBytes = targetSizeKB * 1024;
  const originalSizeKB = Math.round(req.file.size / 1024);

  console.log(`[${requestId}] [PROCESS] File: ${req.file.originalname}`);
  console.log(`[${requestId}] [PROCESS] Original: ${originalSizeKB}KB → Target: ${targetSizeKB}KB`);

  try {
    // Binary search for optimal quality
    let minQ = 10, maxQ = 95, bestBuffer = null, bestQ = maxQ;
    const startTime = Date.now();

    for (let i = 0; i < 7; i++) {
      const q = Math.round((minQ + maxQ) / 2);
      const buffer = await sharp(req.file.buffer)
        .rotate() // Auto-orient based on EXIF
        .jpeg({ quality: q, progressive: true, mozjpeg: true })
        .toBuffer();

      if (buffer.length <= targetBytes) {
        bestBuffer = buffer;
        bestQ = q;
        minQ = q; // Try higher quality
      } else {
        maxQ = q; // Try lower quality
      }

      if (Math.abs(buffer.length - targetBytes) < targetBytes * 0.05) {
        break; // Within 5% of target, good enough
      }
    }

    // If no solution found, use lowest quality
    if (!bestBuffer) {
      bestBuffer = await sharp(req.file.buffer)
        .rotate()
        .jpeg({ quality: 10, progressive: true, mozjpeg: true })
        .toBuffer();
      bestQ = 10;
    }

    const compressedSizeKB = Math.round(bestBuffer.length / 1024);
    const saved = Math.round(((req.file.size - bestBuffer.length) / req.file.size) * 100);
    const duration = Date.now() - startTime;

    console.log(`[${requestId}] [SUCCESS] ${originalSizeKB}KB → ${compressedSizeKB}KB (${saved}% saved, ${duration}ms, quality ${bestQ}%)`);

    const baseName = req.file.originalname.replace(/\.[^/.]+$/, '');
    res.set({
      'Content-Disposition': `attachment; filename="${baseName}-compressed-${bestQ}q.jpg"`,
      'Content-Type': 'image/jpeg',
      'X-Compression-Quality': bestQ,
      'X-Original-Size': req.file.size,
      'X-Compressed-Size': bestBuffer.length,
      'X-Processing-Time': duration
    });

    res.send(bestBuffer);

  } catch (error) {
    console.error(`[${requestId}] [FAILURE] ${error.message}`);
    res.status(500).json({
      error: 'Compression failed',
      message: error.message,
      code: 'COMPRESSION_ERROR'
    });
  }
});

/* =====================================================================
   ERROR HANDLING
   ===================================================================== */

// Multer errors
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: 'File too large',
        message: 'Maximum file size is 200MB',
        code: 'FILE_TOO_LARGE'
      });
    }
  }

  if (err) {
    console.error('[ERROR]', err.message);
    return res.status(500).json({
      error: 'Internal server error',
      message: NODE_ENV === 'development' ? err.message : 'Something went wrong',
      code: 'SERVER_ERROR'
    });
  }

  next();
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
    code: 'NOT_FOUND'
  });
});

/* =====================================================================
   SERVER STARTUP + GRACEFUL SHUTDOWN
   ===================================================================== */

const server = app.listen(PORT, () => {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  ProFile Compressor — Diamond Server');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  🟢 Status:      ONLINE`);
  console.log(`  🌐 URL:         http://localhost:${PORT}`);
  console.log(`  🔧 Environment: ${NODE_ENV}`);
  console.log(`  📦 Mode:        Client-side compression (privacy-first)`);
  console.log(`  🚀 API:         POST /api/compress/image (optional)`);
  console.log('═══════════════════════════════════════════════════════════\n');
});

// Graceful shutdown
const shutdown = (signal) => {
  console.log(`\n[${signal}] Shutting down gracefully...`);
  server.close(() => {
    console.log('[SHUTDOWN] Server closed');
    process.exit(0);
  });

  // Force shutdown after 10s
  setTimeout(() => {
    console.error('[SHUTDOWN] Forced exit');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught exception:', err);
  shutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled rejection:', reason);
  shutdown('UNHANDLED_REJECTION');
});