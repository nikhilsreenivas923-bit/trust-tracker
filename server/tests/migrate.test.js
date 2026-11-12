const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const {
  extractProjectRef,
  loadMigrationFiles,
  applyMigrationsViaPg,
  applyMigrationsViaManagementApi,
  seedDatabaseWithServiceRole,
  runMigration,
} = require('../scripts/migrate');

test('extractProjectRef parses Supabase Cloud URLs accurately', () => {
  assert.equal(
    extractProjectRef('https://xyzcompany123.supabase.co'),
    'xyzcompany123'
  );
  assert.equal(extractProjectRef('http://localhost:54321'), null);
  assert.equal(extractProjectRef('not-a-url'), null);
});

test('loadMigrationFiles loads 001_initial_schema.sql containing tables, RLS, and seed data', () => {
  const migrations = loadMigrationFiles();
  assert.ok(migrations.length >= 1);
  const initial = migrations.find(
    (m) => m.filename === '001_initial_schema.sql'
  );
  assert.ok(initial, '001_initial_schema.sql should exist');
  assert.match(initial.sql, /CREATE TABLE IF NOT EXISTS candidates/i);
  assert.match(initial.sql, /CREATE TABLE IF NOT EXISTS claims/i);
  assert.match(initial.sql, /ENABLE ROW LEVEL SECURITY/i);
  assert.match(initial.sql, /CREATE POLICY/i);
  assert.match(initial.sql, /Marcus Vance/);
  assert.match(initial.sql, /Elena Rostova/);
});

test('applyMigrationsViaPg runs unapplied SQL inside a transaction and tracks applied files', async () => {
  const executedQueries = [];
  class MockPgClient {
    async connect() {}
    async end() {}
    async query(sql, params) {
      executedQueries.push({ sql, params });
      if (sql.includes('SELECT filename FROM public._app_migrations')) {
        return { rows: [] };
      }
      return { rows: [] };
    }
  }

  const result = await applyMigrationsViaPg({
    connectionString: 'postgresql://postgres:pass@db.abc.supabase.co:5432/postgres',
    migrations: [{ filename: '001_initial_schema.sql', sql: 'CREATE TABLE t();' }],
    ClientClass: MockPgClient,
    logger: { log: () => {} },
  });

  assert.equal(result.strategy, 'pg');
  assert.deepEqual(result.executed, ['001_initial_schema.sql']);
  assert.ok(executedQueries.some((q) => q.sql === 'BEGIN'));
  assert.ok(executedQueries.some((q) => q.sql === 'CREATE TABLE t();'));
  assert.ok(executedQueries.some((q) => q.sql === 'COMMIT'));
});

test('applyMigrationsViaManagementApi posts SQL to Supabase Management API', async () => {
  const calls = [];
  const fakeFetch = async (url, opts) => {
    calls.push({ url, body: JSON.parse(opts.body) });
    if (calls.length === 2) {
      return { ok: true, json: async () => [] };
    }
    return { ok: true, json: async () => ({}) };
  };

  const result = await applyMigrationsViaManagementApi({
    supabaseUrl: 'https://demo123.supabase.co',
    accessToken: 'sbp_token',
    migrations: [{ filename: '001_initial_schema.sql', sql: 'SELECT 1;' }],
    fetchImpl: fakeFetch,
    logger: { log: () => {} },
  });

  assert.equal(result.strategy, 'management-api');
  assert.deepEqual(result.executed, ['001_initial_schema.sql']);
  assert.equal(
    calls[0].url,
    'https://api.supabase.com/v1/projects/demo123/database/query'
  );
});

test('seedDatabaseWithServiceRole creates demo user if needed and upserts candidates and claims', async () => {
  const upserts = [];
  let createdUserEmail = null;

  const mockSupabaseAdmin = {
    auth: {
      admin: {
        listUsers: async () => ({ data: { users: [] }, error: null }),
        createUser: async ({ email }) => {
          createdUserEmail = email;
          return {
            data: { user: { id: 'recruiter-uuid-1', email } },
            error: null,
          };
        },
      },
    },
    from: (table) => ({
      upsert: async (rows) => {
        upserts.push({ table, count: Array.isArray(rows) ? rows.length : 1, rows });
        return { error: null };
      },
    }),
  };

  const result = await seedDatabaseWithServiceRole({
    supabaseAdmin: mockSupabaseAdmin,
    logger: { log: () => {} },
  });

  assert.equal(createdUserEmail, 'demo.recruiter@trusttracker.local');
  assert.equal(result.recruiterId, 'recruiter-uuid-1');
  assert.equal(result.seededCandidates, 2);
  assert.equal(upserts.filter((u) => u.table === 'candidates').length, 2);
  assert.equal(upserts.filter((u) => u.table === 'claims').length, 2);

  const marcusUpsert = upserts.find(
    (u) => u.table === 'candidates' && u.rows.name === 'Marcus Vance'
  );
  const elenaUpsert = upserts.find(
    (u) => u.table === 'candidates' && u.rows.name === 'Elena Rostova'
  );
  assert.equal(marcusUpsert.rows.overall_trust_score, 0);
  assert.equal(elenaUpsert.rows.overall_trust_score, 98);
});

test('runMigration reports clear instructions when tables do not exist and only service role key is provided', async () => {
  const mockSupabaseAdmin = {
    rpc: async () => ({ error: { message: 'function not found' } }),
    from: () => ({
      select: () => ({
        limit: async () => ({
          data: null,
          error: { message: 'relation "public.candidates" does not exist' },
        }),
      }),
    }),
  };

  await assert.rejects(
    () =>
      runMigration({
        env: {
          SUPABASE_URL: 'https://demo123.supabase.co',
          SUPABASE_SERVICE_ROLE_KEY: 'service-role-secret',
        },
        migrationsDir: path.resolve(__dirname, '..', '..', 'supabase', 'migrations'),
        deps: { createClient: () => mockSupabaseAdmin },
        logger: { log: () => {} },
      }),
    /SUPABASE_DB_URL/
  );
});

