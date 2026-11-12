# TrustTracker AI — Resume Claim Verification Platform

AI-Powered Trust Tracker for technical recruiters to extract atomic resume claims, compute aggregate Trust Scores, detect timeline overlaps and historically impossible experience using Google Gemini (`@google/genai`), and audit each claim manually with Supabase PostgreSQL + Row Level Security (RLS).

## Tech Stack

- **Frontend:** React 19 (Vite), Tailwind CSS, React Router, DOMPurify
- **Backend:** Node.js, Express.js, Helmet, Multer, `pdf-parse`
- **Database & Auth:** Supabase (PostgreSQL, Row Level Security, Supabase Auth)
- **AI Integration:** `@google/genai` SDK (Google Gemini)
- **Validation:** Zod (API payloads + AI structured output parsing)

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Supabase Schema, RLS & Seed Data

Run the migration and seed script via Node.js:

```bash
npm run db:migrate
```

`server/scripts/migrate.js` applies [`supabase/migrations/001_initial_schema.sql`](./supabase/migrations/001_initial_schema.sql) (tables, indexes, RLS policies, and seed data) and seeds demo records via `SUPABASE_SERVICE_ROLE_KEY`. Because Supabase Cloud's PostgREST endpoint blocks raw `CREATE TABLE` DDL with only a service role key, provide either `SUPABASE_DB_URL` (direct Postgres connection string) or `SUPABASE_ACCESS_TOKEN` (Supabase Management API token) in `.env` for automated DDL execution—or paste `supabase/migrations/001_initial_schema.sql` once in the Supabase Dashboard SQL Editor and run `npm run db:seed`.

### 3. Configure Environment Variables

Copy `.env.example` to `.env` at the repository root and fill in your credentials:

```bash
cp .env.example .env
```

- `SUPABASE_URL` & `SUPABASE_ANON_KEY`: Used by both backend and Vite frontend.
- `SUPABASE_SERVICE_ROLE_KEY` & `GEMINI_API_KEY`: Backend-only secrets (never exposed to the browser bundle).
- `PORT`: Backend Express port (default `3000`).

### 4. Run Development Servers

```bash
npm run dev
```

- Frontend (Vite): `http://localhost:5173`
- Backend (Express): `http://localhost:3000`

### 5. Run Tests & Production Build

```bash
npm test
npm run build
```
