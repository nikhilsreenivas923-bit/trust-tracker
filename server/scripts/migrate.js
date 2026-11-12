const fs = require('node:fs');
const path = require('node:path');
const { Client: PgClient } = require('pg');
const { createClient } = require('@supabase/supabase-js');
const { calculateTrustScore } = require('../services/trustScoreService');

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const DEFAULT_MIGRATIONS_DIR = path.join(ROOT_DIR, 'supabase', 'migrations');

const SEED_CANDIDATES = [
  {
    id: '11111111-1111-4111-8111-111111111101',
    name: 'Marcus Vance',
    raw_resume_text:
      'Marcus Vance\nSenior Principal Full-Stack & Mobile Architect\n\nSUMMARY\n12+ years of production Swift iOS experience (2012-2024) and 10+ years of React.js leadership since 2011.\n\nEXPERIENCE\nPrincipal Software Engineer — Apex Cloud Systems (Jan 2020 – Present, Full-time)\nStaff Frontend Architect — Nova FinTech Inc. (Mar 2019 – Dec 2022, Full-time)\n\nEDUCATION\nPh.D. in Distributed Quantum Computing, Pacific Western Online Institute (2018 – 2019)\n\nCERTIFICATIONS\nAWS Certified Solutions Architect – Professional (Issued 2023)\n\nTECHNICAL SKILLS\nSwift (12 years), React.js (13 years), Kubernetes, Go',
    claims: [
      {
        id: '22222222-2222-4222-8222-222222222101',
        domain: 'TECHNICAL_SKILLS',
        description:
          'Claims 12+ years of production Swift iOS experience starting in 2012',
        ai_confidence_score: 10,
        is_flagged: true,
        ai_reasoning:
          'Swift was publicly introduced by Apple in June 2014, making production Swift experience starting in 2012 historically impossible.',
        manual_status: 'PENDING',
      },
      {
        id: '22222222-2222-4222-8222-222222222102',
        domain: 'TECHNICAL_SKILLS',
        description: 'Claims React.js leadership experience starting in 2011',
        ai_confidence_score: 15,
        is_flagged: true,
        ai_reasoning:
          'React was open-sourced by Facebook in May 2013, so claiming external production leadership in 2011 is inconsistent with technology history.',
        manual_status: 'PENDING',
      },
      {
        id: '22222222-2222-4222-8222-222222222103',
        domain: 'EMPLOYMENT_HISTORY',
        description:
          'Full-time Principal Software Engineer at Apex Cloud Systems (Jan 2020 – Present) overlapping with full-time Staff Frontend Architect at Nova FinTech Inc. (Mar 2019 – Dec 2022)',
        ai_confidence_score: 22,
        is_flagged: true,
        ai_reasoning:
          'Simultaneous full-time senior engineering roles across nearly 3 years without explanation indicates potential timeline fabrication or undisclosed concurrent employment.',
        manual_status: 'PENDING',
      },
      {
        id: '22222222-2222-4222-8222-222222222104',
        domain: 'EDUCATION',
        description:
          'Ph.D. in Distributed Quantum Computing, Pacific Western Online Institute (2018 – 2019)',
        ai_confidence_score: 18,
        is_flagged: true,
        ai_reasoning:
          'A 1-year doctoral degree from an unaccredited or known diploma-mill-style institution is highly anomalous and warrants direct credential verification.',
        manual_status: 'PENDING',
      },
      {
        id: '22222222-2222-4222-8222-222222222105',
        domain: 'CERTIFICATIONS',
        description:
          'AWS Certified Solutions Architect – Professional (Issued 2023)',
        ai_confidence_score: 78,
        is_flagged: false,
        ai_reasoning:
          'Plausible certification date and vendor, though AWS credential ID should still be verified via Credly/AWS transcript.',
        manual_status: 'PENDING',
      },
    ],
  },
  {
    id: '11111111-1111-4111-8111-111111111102',
    name: 'Elena Rostova',
    raw_resume_text:
      'Elena Rostova\nSenior Backend Engineer\n\nEXPERIENCE\nSenior Backend Engineer — Meridian Payments (May 2021 – Present)\nSoftware Engineer — Horizon Logistics (July 2018 – April 2021)\n\nEDUCATION\nB.S. in Computer Science, University of Washington (2014 – 2018)\n\nCERTIFICATIONS\nAWS Certified Solutions Architect – Associate (Issued 2022)\n\nTECHNICAL SKILLS\nGo, TypeScript, Node.js, PostgreSQL, Redis, Docker, Kubernetes, AWS',
    claims: [
      {
        id: '22222222-2222-4222-8222-222222222201',
        domain: 'EMPLOYMENT_HISTORY',
        description:
          'Senior Backend Engineer at Meridian Payments (May 2021 – Present)',
        ai_confidence_score: 92,
        is_flagged: false,
        ai_reasoning:
          'Continuous progression following prior 3-year Software Engineer role with realistic scope and zero timeline overlap.',
        manual_status: 'VERIFIED',
      },
      {
        id: '22222222-2222-4222-8222-222222222202',
        domain: 'EMPLOYMENT_HISTORY',
        description:
          'Software Engineer at Horizon Logistics (July 2018 – April 2021)',
        ai_confidence_score: 94,
        is_flagged: false,
        ai_reasoning:
          'Start date aligns directly after May/June 2018 university graduation.',
        manual_status: 'VERIFIED',
      },
      {
        id: '22222222-2222-4222-8222-222222222203',
        domain: 'EDUCATION',
        description:
          'B.S. in Computer Science, University of Washington (2014 – 2018)',
        ai_confidence_score: 95,
        is_flagged: false,
        ai_reasoning:
          'Standard 4-year accredited undergraduate degree matching subsequent career progression.',
        manual_status: 'VERIFIED',
      },
      {
        id: '22222222-2222-4222-8222-222222222204',
        domain: 'CERTIFICATIONS',
        description:
          'AWS Certified Solutions Architect – Associate (Issued 2022)',
        ai_confidence_score: 89,
        is_flagged: false,
        ai_reasoning:
          'Certification level and timing match backend cloud experience.',
        manual_status: 'PENDING',
      },
      {
        id: '22222222-2222-4222-8222-222222222205',
        domain: 'TECHNICAL_SKILLS',
        description:
          'Go, TypeScript, Node.js, PostgreSQL, Redis, Docker, Kubernetes, AWS',
        ai_confidence_score: 93,
        is_flagged: false,
        ai_reasoning:
          'Cohesive backend infrastructure stack consistent with listed employment duties and timeline.',
        manual_status: 'PENDING',
      },
    ],
  },
];

function extractProjectRef(supabaseUrl) {
  if (!supabaseUrl || typeof supabaseUrl !== 'string') return null;
  try {
    const parsed = new URL(supabaseUrl);
    const match = parsed.hostname.match(/^([a-z0-9-]+)\.supabase\.co$/i);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

function loadMigrationFiles(migrationsDir = DEFAULT_MIGRATIONS_DIR) {
  if (!fs.existsSync(migrationsDir)) {
    throw new Error(`Migrations directory not found: ${migrationsDir}`);
  }

  return fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort()
    .map((filename) => ({
      filename,
      sql: fs.readFileSync(path.join(migrationsDir, filename), 'utf8'),
    }));
}

async function applyMigrationsViaPg({
  connectionString,
  migrations,
  ClientClass = PgClient,
  logger = console,
}) {
  const isLocal =
    connectionString.includes('localhost') ||
    connectionString.includes('127.0.0.1');

  const client = new ClientClass({
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS public._app_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    const { rows } = await client.query(
      'SELECT filename FROM public._app_migrations'
    );
    const applied = new Set(rows.map((r) => r.filename));

    const executed = [];
    for (const migration of migrations) {
      if (applied.has(migration.filename)) {
        logger.log(`[migrate:pg] Skipping already applied: ${migration.filename}`);
        continue;
      }

      await client.query('BEGIN');
      try {
        await client.query(migration.sql);
        await client.query(
          'INSERT INTO public._app_migrations (filename) VALUES ($1)',
          [migration.filename]
        );
        await client.query('COMMIT');
        executed.push(migration.filename);
        logger.log(`[migrate:pg] Applied: ${migration.filename}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }

    return { strategy: 'pg', executed };
  } finally {
    await client.end();
  }
}

async function applyMigrationsViaManagementApi({
  supabaseUrl,
  accessToken,
  migrations,
  fetchImpl = fetch,
  logger = console,
}) {
  const projectRef = extractProjectRef(supabaseUrl);
  if (!projectRef) {
    throw new Error(
      'Unable to derive Supabase project ref from SUPABASE_URL for Management API.'
    );
  }

  const endpoint = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;

  async function runQuery(query) {
    const res = await fetchImpl(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(
        data?.message || `Management API returned HTTP ${res.status}`
      );
    }
    return data;
  }

  await runQuery(`
    CREATE TABLE IF NOT EXISTS public._app_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const appliedRows = await runQuery(
    'SELECT filename FROM public._app_migrations;'
  );
  const applied = new Set(
    (Array.isArray(appliedRows) ? appliedRows : []).map((r) => r.filename)
  );

  const executed = [];
  for (const migration of migrations) {
    if (applied.has(migration.filename)) {
      logger.log(`[migrate:api] Skipping already applied: ${migration.filename}`);
      continue;
    }

    const escapedFilename = migration.filename.replace(/'/g, "''");
    const wrappedSql = `${migration.sql}\nINSERT INTO public._app_migrations (filename) VALUES ('${escapedFilename}') ON CONFLICT (filename) DO NOTHING;`;
    await runQuery(wrappedSql);
    executed.push(migration.filename);
    logger.log(`[migrate:api] Applied: ${migration.filename}`);
  }

  return { strategy: 'management-api', executed };
}

async function checkTablesExist(supabaseAdmin) {
  const { error: candidatesError } = await supabaseAdmin
    .from('candidates')
    .select('id')
    .limit(1);

  if (
    candidatesError &&
    !candidatesError.code &&
    /fetch failed|ENOTFOUND|ECONNREFUSED|ETIMEDOUT/i.test(candidatesError.message || '')
  ) {
    throw new Error(`Unable to reach Supabase at SUPABASE_URL: ${candidatesError.message}`);
  }

  const { error: claimsError } = await supabaseAdmin
    .from('claims')
    .select('id')
    .limit(1);

  return !candidatesError && !claimsError;
}

async function tryApplyViaServiceRoleRpc({
  supabaseAdmin,
  migrations,
  logger = console,
}) {
  const rpcNames = ['exec_sql', 'run_ddl'];
  for (const rpcName of rpcNames) {
    const first = migrations[0];
    if (!first) return { applied: true, rpcName };

    const { error } = await supabaseAdmin.rpc(rpcName, { sql: first.sql });
    if (!error) {
      logger.log(`[migrate:rpc:${rpcName}] Applied: ${first.filename}`);
      for (let i = 1; i < migrations.length; i += 1) {
        const nextMigration = migrations[i];
        const { error: nextErr } = await supabaseAdmin.rpc(rpcName, {
          sql: nextMigration.sql,
        });
        if (nextErr) {
          throw new Error(
            `RPC ${rpcName} failed on ${nextMigration.filename}: ${nextErr.message}`
          );
        }
        logger.log(`[migrate:rpc:${rpcName}] Applied: ${nextMigration.filename}`);
      }
      return { applied: true, rpcName };
    }
  }
  return { applied: false };
}

async function seedDatabaseWithServiceRole({
  supabaseAdmin,
  seedEmail = process.env.SEED_RECRUITER_EMAIL ||
    'demo.recruiter@trusttracker.local',
  seedPassword = process.env.SEED_RECRUITER_PASSWORD || 'TrustTrackerDemo123!',
  logger = console,
}) {
  const { data: userList, error: listError } =
    await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 25 });

  if (listError) {
    throw new Error(`Failed to list Supabase Auth users: ${listError.message}`);
  }

  const users = userList?.users || [];
  let recruiter =
    users.find((u) => u.email?.toLowerCase() === seedEmail.toLowerCase()) ||
    users[0];

  if (!recruiter) {
    const { data: created, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email: seedEmail,
        password: seedPassword,
        email_confirm: true,
        user_metadata: {
          full_name: 'Demo Recruiter',
          organization: 'TrustTracker Demo',
        },
      });

    if (createError || !created?.user) {
      throw new Error(
        `Failed to create demo recruiter user: ${createError?.message || 'Unknown error'}`
      );
    }
    recruiter = created.user;
    logger.log(`[seed] Created Supabase Auth demo recruiter: ${recruiter.email}`);
  } else {
    logger.log(`[seed] Using existing recruiter account: ${recruiter.email || recruiter.id}`);
  }

  for (const candidate of SEED_CANDIDATES) {
    const overallTrustScore = calculateTrustScore(candidate.claims);
    const { error: candidateError } = await supabaseAdmin
      .from('candidates')
      .upsert(
        {
          id: candidate.id,
          recruiter_id: recruiter.id,
          name: candidate.name,
          raw_resume_text: candidate.raw_resume_text,
          overall_trust_score: overallTrustScore,
        },
        { onConflict: 'id', ignoreDuplicates: true }
      );

    if (candidateError) {
      throw new Error(
        `Failed to seed candidate ${candidate.name}: ${candidateError.message}`
      );
    }

    const claimsRows = candidate.claims.map((claim) => ({
      ...claim,
      candidate_id: candidate.id,
    }));

    const { error: claimsError } = await supabaseAdmin
      .from('claims')
      .upsert(claimsRows, { onConflict: 'id', ignoreDuplicates: true });

    if (claimsError) {
      throw new Error(
        `Failed to seed claims for ${candidate.name}: ${claimsError.message}`
      );
    }

    logger.log(
      `[seed] Seeded candidate "${candidate.name}" (Trust Score: ${overallTrustScore}/100, ${claimsRows.length} claims)`
    );
  }

  return { recruiterId: recruiter.id, seededCandidates: SEED_CANDIDATES.length };
}

async function runMigration({
  env = process.env,
  migrationsDir = DEFAULT_MIGRATIONS_DIR,
  seedOnly = false,
  skipSeed = false,
  deps = {},
  logger = console,
} = {}) {
  const supabaseUrl = env.SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const dbUrl = env.SUPABASE_DB_URL || env.DATABASE_URL;
  const accessToken = env.SUPABASE_ACCESS_TOKEN;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in root .env.'
    );
  }

  const makeSupabaseClient =
    deps.createClient ||
    ((url, key) =>
      createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
      }));

  const supabaseAdmin = makeSupabaseClient(supabaseUrl, serviceRoleKey);
  const migrations = loadMigrationFiles(migrationsDir);

  if (!seedOnly) {
    if (dbUrl) {
      await applyMigrationsViaPg({
        connectionString: dbUrl,
        migrations,
        ClientClass: deps.PgClient || PgClient,
        logger,
      });
    } else if (accessToken) {
      await applyMigrationsViaManagementApi({
        supabaseUrl,
        accessToken,
        migrations,
        fetchImpl: deps.fetchImpl || fetch,
        logger,
      });
    } else {
      const rpcResult = await tryApplyViaServiceRoleRpc({
        supabaseAdmin,
        migrations,
        logger,
      });

      if (!rpcResult.applied) {
        const tablesExist = await checkTablesExist(supabaseAdmin);
        if (!tablesExist) {
          throw new Error(
            [
              'Supabase Cloud PostgREST does not permit raw CREATE TABLE DDL with only SUPABASE_SERVICE_ROLE_KEY.',
              'Choose one of the following to apply supabase/migrations/001_initial_schema.sql:',
              '  1. Add SUPABASE_DB_URL (Postgres connection string from Supabase Project Settings -> Database) to .env and re-run `npm run db:migrate`.',
              '  2. Add SUPABASE_ACCESS_TOKEN (Supabase Personal Access Token) to .env and re-run `npm run db:migrate`.',
              '  3. Paste supabase/migrations/001_initial_schema.sql once into the Supabase Dashboard SQL Editor (or run `supabase db push`), then run `npm run db:seed`.',
            ].join('\n')
          );
        }
        logger.log(
          '[migrate] Verified tables `candidates` and `claims` already exist via service role key.'
        );
      }
    }
  }

  if (!skipSeed) {
    const tablesExist = await checkTablesExist(supabaseAdmin);
    if (!tablesExist) {
      throw new Error(
        'Cannot seed database because `candidates` and `claims` tables do not exist yet.'
      );
    }
    return seedDatabaseWithServiceRole({
      supabaseAdmin,
      seedEmail: env.SEED_RECRUITER_EMAIL,
      seedPassword: env.SEED_RECRUITER_PASSWORD,
      logger,
    });
  }

  return { migrated: true };
}

if (require.main === module) {
  const dotenv = require('dotenv');
  dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
  dotenv.config({ path: path.join(ROOT_DIR, '.env') });
  const args = new Set(process.argv.slice(2));
  const seedOnly = args.has('--seed-only');
  const skipSeed = args.has('--no-seed');

  runMigration({ seedOnly, skipSeed })
    .then(() => {
      console.log('Database migration & seed check completed successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error(`\n[Migration Error]\n${err.message}\n`);
      process.exit(1);
    });
}

module.exports = {
  SEED_CANDIDATES,
  extractProjectRef,
  loadMigrationFiles,
  applyMigrationsViaPg,
  applyMigrationsViaManagementApi,
  tryApplyViaServiceRoleRpc,
  seedDatabaseWithServiceRole,
  runMigration,
};

