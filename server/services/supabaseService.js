const { createClient } = require('@supabase/supabase-js');

function getSupabaseConfig() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || (!supabaseAnonKey && !supabaseServiceRoleKey)) {
    throw new Error(
      'Supabase configuration missing: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) are required.'
    );
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
    supabaseServiceRoleKey,
  };
}

let cachedAdminClient = null;

/**
 * Returns a server-only Supabase admin client for token verification.
 * Falls back to the anon key if SUPABASE_SERVICE_ROLE_KEY is omitted in local setup.
 */
function getSupabaseAdminClient() {
  if (cachedAdminClient) {
    return cachedAdminClient;
  }

  const { supabaseUrl, supabaseAnonKey, supabaseServiceRoleKey } = getSupabaseConfig();
  const key = supabaseServiceRoleKey || supabaseAnonKey;

  cachedAdminClient = createClient(supabaseUrl, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return cachedAdminClient;
}

/**
 * Creates a per-request Supabase client scoped to the authenticated recruiter's JWT,
 * ensuring PostgreSQL Row Level Security (RLS) policies are enforced at the DB layer.
 */
function createUserSupabaseClient(accessToken) {
  const { supabaseUrl, supabaseAnonKey, supabaseServiceRoleKey } = getSupabaseConfig();
  const apiKey = supabaseAnonKey || supabaseServiceRoleKey;

  return createClient(supabaseUrl, apiKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

module.exports = {
  getSupabaseConfig,
  getSupabaseAdminClient,
  createUserSupabaseClient,
};

