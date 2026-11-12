const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { PassThrough } = require('node:stream');

const {
  analyzeResumePayloadSchema,
  aiAnalysisResponseSchema,
  updateClaimStatusSchema,
  uuidParamSchema,
} = require('../utils/validationSchemas');
const { sanitizeText } = require('../utils/sanitize');
const { calculateTrustScore } = require('../services/trustScoreService');
const {
  SYSTEM_PROMPT,
  analyzeResumeWithGemini,
} = require('../services/geminiService');
const { createApp } = require('../app');

test('analyzeResumePayloadSchema enforces min 50 and max 15000 characters', () => {
  assert.equal(
    analyzeResumePayloadSchema.safeParse({ rawResumeText: 'Too short' }).success,
    false
  );
  assert.equal(
    analyzeResumePayloadSchema.safeParse({ rawResumeText: ' '.repeat(80) }).success,
    false
  );
  assert.equal(
    analyzeResumePayloadSchema.safeParse({ rawResumeText: 'a'.repeat(15001) }).success,
    false
  );
  assert.equal(
    analyzeResumePayloadSchema.safeParse({
      rawResumeText: 'Jane Doe Senior Engineer at Acme Corp from 2019 to 2024 in Seattle.',
    }).success,
    true
  );
});

test('aiAnalysisResponseSchema validates structured Gemini output strictly', () => {
  const validPayload = {
    candidateName: 'Jane Doe',
    claims: [
      {
        domain: 'EMPLOYMENT_HISTORY',
        description: 'Senior Engineer at Acme Corp (2020-2024)',
        aiConfidenceScore: 92,
        isFlagged: false,
        aiReasoning: 'Timeline aligns cleanly with graduation year.',
      },
    ],
  };
  assert.equal(aiAnalysisResponseSchema.safeParse(validPayload).success, true);

  const invalidDomain = {
    candidateName: 'Jane Doe',
    claims: [
      {
        domain: 'HOBBIES',
        description: 'Chess',
        aiConfidenceScore: 90,
        isFlagged: false,
        aiReasoning: 'N/A',
      },
    ],
  };
  assert.equal(aiAnalysisResponseSchema.safeParse(invalidDomain).success, false);
});

test('updateClaimStatusSchema accepts valid manual statuses and rejects invalid ones', () => {
  assert.deepEqual(
    updateClaimStatusSchema.parse({ manualStatus: 'VERIFIED' }),
    { manualStatus: 'VERIFIED' }
  );
  assert.deepEqual(
    updateClaimStatusSchema.parse({ manual_status: 'REJECTED' }),
    { manualStatus: 'REJECTED' }
  );
  assert.equal(
    updateClaimStatusSchema.safeParse({ manualStatus: 'UNKNOWN' }).success,
    false
  );
});

test('sanitizeText removes XSS payloads while preserving technical syntax', () => {
  const dirty =
    'Senior React < 18 & C++ Dev <script>alert(1)</script><img src=x onerror=alert(2)> javascript:void(0)';
  const cleaned = sanitizeText(dirty);
  assert.equal(cleaned.includes('<script>'), false);
  assert.equal(cleaned.includes('<img'), false);
  assert.equal(cleaned.includes('javascript:'), false);
  assert.equal(cleaned.includes('React < 18'), true);
  assert.equal(cleaned.includes('C++'), true);
});

test('calculateTrustScore scales accurately across clean, moderate, and high-risk claims', () => {
  const cleanClaims = [
    { aiConfidenceScore: 94, isFlagged: false },
    { aiConfidenceScore: 90, isFlagged: false },
    { aiConfidenceScore: 88, isFlagged: false },
    { aiConfidenceScore: 92, isFlagged: false },
  ];
  assert.ok(calculateTrustScore(cleanClaims) > 80);

  const moderateClaims = [
    { aiConfidenceScore: 90, isFlagged: false },
    { aiConfidenceScore: 88, isFlagged: false },
    { aiConfidenceScore: 85, isFlagged: false },
    { aiConfidenceScore: 25, isFlagged: true },
  ];
  const moderateScore = calculateTrustScore(moderateClaims);
  assert.ok(moderateScore >= 50 && moderateScore <= 80);

  const riskyClaims = [
    { aiConfidenceScore: 85, isFlagged: false },
    { aiConfidenceScore: 20, isFlagged: true },
    { aiConfidenceScore: 15, isFlagged: true },
    { aiConfidenceScore: 10, isFlagged: true },
  ];
  assert.ok(calculateTrustScore(riskyClaims) < 50);

  // Manual recruiter override to VERIFIED improves the score
  const manuallyVerifiedClaims = riskyClaims.map((c, idx) =>
    idx > 0 ? { ...c, manual_status: 'VERIFIED' } : c
  );
  assert.ok(calculateTrustScore(manuallyVerifiedClaims) > 80);
});

test('analyzeResumeWithGemini invokes SDK with exact system prompt and validates/sanitizes output', async () => {
  let capturedParams = null;
  const fakeAiClient = {
    models: {
      generateContent: async (params) => {
        capturedParams = params;
        return {
          text: JSON.stringify({
            candidateName: 'Marcus Vance <script>xss()</script>',
            claims: [
              {
                domain: 'TECHNICAL_SKILLS',
                description: '10 years of Swift experience in 2018',
                aiConfidenceScore: 12,
                isFlagged: true,
                aiReasoning:
                  'Swift was publicly released in June 2014, making 10 years of experience in 2018 impossible.',
              },
            ],
          }),
        };
      },
    },
  };

  const result = await analyzeResumeWithGemini(
    'Marcus Vance — 10 years of Swift experience in 2018 at Acme Mobile.',
    fakeAiClient
  );

  assert.equal(capturedParams.config.systemInstruction, SYSTEM_PROMPT);
  assert.equal(capturedParams.config.responseMimeType, 'application/json');
  assert.equal(result.candidateName, 'Marcus Vance');
  assert.equal(result.claims[0].isFlagged, true);
  assert.equal(result.claims[0].aiConfidenceScore, 12);
});

test('analyzeResumeWithGemini rejects malformed JSON from Gemini', async () => {
  const brokenAiClient = {
    models: {
      generateContent: async () => ({ text: 'not valid json {' }),
    },
  };

  await assert.rejects(
    () => analyzeResumeWithGemini('Sample valid length resume text for test.', brokenAiClient),
    /malformed JSON/i
  );
});

function dispatchRequest(app, { method = 'GET', url = '/', headers = {}, body = null }) {
  return new Promise((resolve, reject) => {
    const socket = new PassThrough();
    const req = new http.IncomingMessage(socket);
    req.method = method;
    req.url = url;
    req.headers = { host: 'localhost', ...headers };

    const rawBody = body ? JSON.stringify(body) : null;
    if (rawBody) {
      req.headers['content-type'] = 'application/json';
      req.headers['content-length'] = String(Buffer.byteLength(rawBody));
    }

    const res = new http.ServerResponse(req);
    const chunks = [];

    res.assignSocket(socket);
    res.write = (chunk) => {
      if (chunk) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      return true;
    };
    res.end = (chunk) => {
      if (chunk) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      const text = Buffer.concat(chunks).toString('utf8');
      let json = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = null;
      }
      resolve({ status: res.statusCode, body: json, text });
    };

    app.handle(req, res, (err) => {
      if (err) reject(err);
    });

    if (rawBody) {
      req.push(rawBody);
    }
    req.push(null);
  });
}

test('Express routes enforce authentication, payload validation, and clean error handling', async () => {
  const unauthenticatedApp = createApp();

  const healthRes = await dispatchRequest(unauthenticatedApp, {
    method: 'GET',
    url: '/api/health',
  });
  assert.equal(healthRes.status, 200);
  assert.equal(healthRes.body.status, 'ok');

  const unauthCandidates = await dispatchRequest(unauthenticatedApp, {
    method: 'GET',
    url: '/api/candidates',
  });
  assert.equal(unauthCandidates.status, 401);

  const unauthAnalyze = await dispatchRequest(unauthenticatedApp, {
    method: 'POST',
    url: '/api/resumes/analyze',
    body: { rawResumeText: 'x'.repeat(100) },
  });
  assert.equal(unauthAnalyze.status, 401);

  // Authenticated integration check with mocked Supabase query builder
  const validUuid = '11111111-1111-4111-8111-111111111111';
  const candidateUuid = '22222222-2222-4222-8222-222222222222';
  let currentManualStatus = 'PENDING';

  const mockSupabase = {
    from: (table) => {
      if (table === 'claims') {
        return {
          select: () => ({
            eq: (_col, val) => {
              if (val === validUuid) {
                return {
                  maybeSingle: async () => ({
                    data: {
                      id: validUuid,
                      candidate_id: candidateUuid,
                      candidates: { id: candidateUuid, recruiter_id: 'recruiter-1' },
                    },
                    error: null,
                  }),
                };
              }
              return Promise.resolve({
                data: [
                  {
                    ai_confidence_score: 20,
                    is_flagged: true,
                    manual_status: currentManualStatus,
                  },
                ],
                error: null,
              });
            },
          }),
          update: ({ manual_status }) => {
            currentManualStatus = manual_status;
            return {
              eq: () => ({
                select: () => ({
                  single: async () => ({
                    data: {
                      id: validUuid,
                      candidate_id: candidateUuid,
                      manual_status: currentManualStatus,
                      ai_confidence_score: 20,
                      is_flagged: true,
                    },
                    error: null,
                  }),
                }),
              }),
            };
          },
        };
      }

      if (table === 'candidates') {
        return {
          update: () => ({
            eq: () => ({
              eq: async () => ({ error: null }),
            }),
          }),
        };
      }
      return {};
    },
  };

  const authedApp = createApp({
    authMiddleware: (req, _res, next) => {
      req.user = { id: 'recruiter-1' };
      req.supabase = mockSupabase;
      next();
    },
  });

  const shortRes = await dispatchRequest(authedApp, {
    method: 'POST',
    url: '/api/resumes/analyze',
    body: { rawResumeText: 'too short' },
  });
  assert.equal(shortRes.status, 400);

  const badIdRes = await dispatchRequest(authedApp, {
    method: 'GET',
    url: '/api/candidates/not-a-uuid',
  });
  assert.equal(badIdRes.status, 400);

  const badStatusRes = await dispatchRequest(authedApp, {
    method: 'PATCH',
    url: `/api/claims/${validUuid}/status`,
    body: { manualStatus: 'INVALID_STATUS' },
  });
  assert.equal(badStatusRes.status, 400);

  const okPatchRes = await dispatchRequest(authedApp, {
    method: 'PATCH',
    url: `/api/claims/${validUuid}/status`,
    body: { manualStatus: 'VERIFIED' },
  });
  assert.equal(okPatchRes.status, 200);
  assert.equal(okPatchRes.body.claim.manual_status, 'VERIFIED');
  assert.equal(okPatchRes.body.overallTrustScore, 100);
});

test('uuidParamSchema rejects malformed UUIDs', () => {
  assert.equal(uuidParamSchema.safeParse('not-a-uuid').success, false);
  assert.equal(
    uuidParamSchema.safeParse('11111111-1111-4111-8111-111111111111').success,
    true
  );
});
