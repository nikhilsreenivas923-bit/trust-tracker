const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const multer = require('multer');

const { authenticateRecruiter } = require('./middleware/authMiddleware');
const {
  analyzeResume,
  extractResumeText,
} = require('./controllers/resumeController');
const {
  listCandidates,
  getCandidateById,
  deleteCandidateById,
} = require('./controllers/candidateController');
const { updateClaimStatus } = require('./controllers/claimController');

function createApp(options = {}) {
  const app = express();
  const authMiddleware = options.authMiddleware || authenticateRecruiter;

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024, // 5 MB max upload
      files: 1,
    },
  });

  const allowedOrigin = process.env.CLIENT_URL || process.env.CLIENT_ORIGIN || true;

  app.use(helmet());
  app.use(
    cors({
      origin: allowedOrigin,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '100kb' }));

  // Public health check
  app.get('/api/health', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      service: 'trust-tracker-api',
      timestamp: new Date().toISOString(),
    });
  });

  // Protected API routes
  app.post('/api/resumes/analyze', authMiddleware, analyzeResume);
  app.post(
    '/api/resumes/extract-text',
    authMiddleware,
    upload.single('resumeFile'),
    extractResumeText
  );
  app.get('/api/candidates', authMiddleware, listCandidates);
  app.get('/api/candidates/:id', authMiddleware, getCandidateById);
  app.delete('/api/candidates/:id', authMiddleware, deleteCandidateById);
  app.patch('/api/claims/:id/status', authMiddleware, updateClaimStatus);

  // 404 handler for unknown API routes
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  // Global error handler — never leak raw stack traces or provider errors
  app.use((err, _req, res, _next) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          error: 'File exceeds the maximum allowed size of 5 MB.',
        });
      }
      return res.status(400).json({ error: 'Invalid file upload request.' });
    }

    if (err?.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Malformed JSON request body.' });
    }

    console.error('[Server] Unhandled error:', err?.message || err);
    return res.status(500).json({ error: 'An unexpected server error occurred.' });
  });

  return app;
}

module.exports = {
  createApp,
};

