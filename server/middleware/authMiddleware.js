const {
  getSupabaseAdminClient,
  createUserSupabaseClient,
} = require('../services/supabaseService');

/**
 * Verifies the Supabase Auth JWT from `Authorization: Bearer <token>`.
 * Attaches `req.user`, `req.accessToken`, and an RLS-scoped `req.supabase` client.
 */
async function authenticateRecruiter(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Authentication required. Missing Bearer token.',
      });
    }

    const token = authHeader.slice('Bearer '.length).trim();
    if (!token) {
      return res.status(401).json({
        error: 'Authentication required. Empty Bearer token.',
      });
    }

    const adminClient = getSupabaseAdminClient();
    const { data, error } = await adminClient.auth.getUser(token);

    if (error || !data?.user) {
      return res.status(401).json({
        error: 'Invalid or expired authentication session.',
      });
    }

    req.user = data.user;
    req.accessToken = token;
    req.supabase = createUserSupabaseClient(token);

    return next();
  } catch (err) {
    console.error('[AuthMiddleware] Verification error:', err.message);
    return res.status(500).json({
      error: 'Authentication service unavailable.',
    });
  }
}

module.exports = {
  authenticateRecruiter,
};

