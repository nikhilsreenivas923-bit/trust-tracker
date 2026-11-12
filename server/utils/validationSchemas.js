const { z } = require('zod');

const CLAIM_DOMAINS = [
  'EMPLOYMENT_HISTORY',
  'EDUCATION',
  'CERTIFICATIONS',
  'TECHNICAL_SKILLS',
];

const MANUAL_STATUSES = ['PENDING', 'VERIFIED', 'REJECTED'];

/**
 * Validates incoming client payload for POST /api/resumes/analyze.
 * Matches specification: z.object({ rawResumeText: z.string().min(50).max(15000) })
 * while also ensuring at least 50 non-whitespace characters are present.
 */
const analyzeResumePayloadSchema = z.object({
  rawResumeText: z
    .string({ required_error: 'Resume text is required.' })
    .min(50, 'Resume text must be at least 50 characters.')
    .max(15000, 'Resume text cannot exceed 15,000 characters.')
    .refine((val) => val.trim().length >= 50, {
      message: 'Resume text must contain at least 50 non-whitespace characters.',
    }),
});

/**
 * Validates each atomic claim returned by Google Gemini AI.
 */
const aiClaimSchema = z.object({
  domain: z.enum(CLAIM_DOMAINS),
  description: z.string().trim().min(1).max(2000),
  aiConfidenceScore: z
    .number()
    .min(0)
    .max(100)
    .transform((score) => Math.round(score)),
  isFlagged: z.boolean(),
  aiReasoning: z.string().trim().min(1).max(2000),
});

/**
 * Validates the complete structured JSON returned by Google Gemini AI.
 */
const aiAnalysisResponseSchema = z.object({
  candidateName: z.string().trim().min(1).max(255),
  claims: z.array(aiClaimSchema).min(1, 'At least one claim must be extracted.'),
});

/**
 * Validates UUID route parameters before querying PostgreSQL.
 */
const uuidParamSchema = z.string().uuid('Invalid resource identifier.');

/**
 * Validates manual status updates for PATCH /api/claims/:id/status.
 * Accepts either camelCase `manualStatus` or snake_case `manual_status`.
 */
const updateClaimStatusSchema = z.preprocess(
  (input) => {
    if (input && typeof input === 'object' && !Array.isArray(input)) {
      return {
        manualStatus: input.manualStatus ?? input.manual_status,
      };
    }
    return input;
  },
  z.object({
    manualStatus: z.enum(MANUAL_STATUSES, {
      errorMap: () => ({
        message: 'manualStatus must be one of PENDING, VERIFIED, or REJECTED.',
      }),
    }),
  })
);

module.exports = {
  CLAIM_DOMAINS,
  MANUAL_STATUSES,
  analyzeResumePayloadSchema,
  aiClaimSchema,
  aiAnalysisResponseSchema,
  uuidParamSchema,
  updateClaimStatusSchema,
};

