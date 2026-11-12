const { GoogleGenAI, Type } = require('@google/genai');
const {
  CLAIM_DOMAINS,
  aiAnalysisResponseSchema,
} = require('../utils/validationSchemas');
const { sanitizeText } = require('../utils/sanitize');

const SYSTEM_PROMPT =
  'You are an expert Technical Recruiter and Fraud Detection AI. Your job is to analyze raw resume text, extract factual claims regarding employment, education, certifications, and skills. You must critically evaluate these claims for logical inconsistencies, timeline overlaps, historically impossible technical experience, and signs of exaggeration. You will return structured JSON.';

const USER_PROMPT_PREFIX =
  "Analyze the following resume text. Extract the candidate's name and all core claims. For each claim, assign a confidence score (0-100) based on how realistic and verifiable it is. Flag any claim that seems exaggerated, logically impossible, or overlaps conflictingly with other timelines. Provide your reasoning.";

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    candidateName: {
      type: Type.STRING,
      description: 'Full name of the candidate extracted from the resume.',
    },
    claims: {
      type: Type.ARRAY,
      description: 'List of atomic verifiable claims extracted from the resume.',
      items: {
        type: Type.OBJECT,
        properties: {
          domain: {
            type: Type.STRING,
            enum: CLAIM_DOMAINS,
          },
          description: {
            type: Type.STRING,
            description: 'Concise factual statement of the extracted claim.',
          },
          aiConfidenceScore: {
            type: Type.INTEGER,
            description: 'Confidence score from 0 to 100.',
          },
          isFlagged: {
            type: Type.BOOLEAN,
            description: 'True if the claim is suspicious, contradictory, or exaggerated.',
          },
          aiReasoning: {
            type: Type.STRING,
            description: 'Clear explanation of why the claim is flagged or trusted.',
          },
        },
        required: [
          'domain',
          'description',
          'aiConfidenceScore',
          'isFlagged',
          'aiReasoning',
        ],
      },
    },
  },
  required: ['candidateName', 'claims'],
};

let cachedAiClient = null;

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }
  if (!cachedAiClient) {
    cachedAiClient = new GoogleGenAI({ apiKey });
  }
  return cachedAiClient;
}

/**
 * Sends raw resume text to Google Gemini via @google/genai, parses structured JSON,
 * validates against Zod schema, and sanitizes all text fields.
 */
async function analyzeResumeWithGemini(rawResumeText, aiClientOverride = null) {
  const ai = aiClientOverride || getGeminiClient();
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const currentDateIso = new Date().toISOString().split('T')[0];

  const prompt = `${USER_PROMPT_PREFIX}

Reference Current Date: ${currentDateIso}

--- BEGIN RESUME TEXT ---
${rawResumeText}
--- END RESUME TEXT ---`;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      temperature: 0.1,
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
    },
  });

  const rawJsonText = response?.text;
  if (!rawJsonText || typeof rawJsonText !== 'string') {
    throw new Error('AI analysis returned an empty response.');
  }

  let parsedJson;
  try {
    parsedJson = JSON.parse(rawJsonText);
  } catch {
    throw new Error('AI analysis returned malformed JSON.');
  }

  const validation = aiAnalysisResponseSchema.safeParse(parsedJson);
  if (!validation.success) {
    throw new Error('AI analysis output failed schema validation.');
  }

  return {
    candidateName: sanitizeText(validation.data.candidateName) || 'Unknown Candidate',
    claims: validation.data.claims.map((claim) => ({
      domain: claim.domain,
      description: sanitizeText(claim.description),
      aiConfidenceScore: claim.aiConfidenceScore,
      isFlagged: claim.isFlagged,
      aiReasoning: sanitizeText(claim.aiReasoning),
    })),
  };
}

module.exports = {
  SYSTEM_PROMPT,
  USER_PROMPT_PREFIX,
  RESPONSE_SCHEMA,
  analyzeResumeWithGemini,
};

