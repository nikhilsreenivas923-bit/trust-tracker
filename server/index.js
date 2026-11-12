const path = require('node:path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const { createApp } = require('./app');

const PORT = Number(process.env.PORT) || 3000;

function validateEnvironment() {
  const missing = [];
  if (!process.env.SUPABASE_URL) missing.push('SUPABASE_URL');
  if (!process.env.SUPABASE_ANON_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    missing.push('SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY)');
  }
  if (!process.env.GEMINI_API_KEY) missing.push('GEMINI_API_KEY');

  if (missing.length > 0) {
    console.warn(
      `[Startup Warning] Missing environment variables: ${missing.join(', ')}. Configure server/.env or root .env before processing requests.`
    );
  }
}

validateEnvironment();

const app = createApp();
app.listen(PORT, () => {
  console.log(`TrustTracker API server listening on http://localhost:${PORT}`);
});

