const pdfParse = require('pdf-parse');
const { analyzeResumePayloadSchema } = require('../utils/validationSchemas');
const { sanitizeText } = require('../utils/sanitize');
const { analyzeResumeWithGemini } = require('../services/geminiService');
const { calculateTrustScore } = require('../services/trustScoreService');

const MAX_RESUME_CHARS = 15000;

/**
 * POST /api/resumes/analyze
 * Validates rawResumeText, invokes Gemini AI, computes Trust Score,
 * persists candidate + claims in Supabase, and returns the new report.
 */
async function analyzeResume(req, res) {
  try {
    const parsed = analyzeResumePayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]?.message || 'Invalid resume payload.';
      return res.status(400).json({ error: firstIssue });
    }

    const cleanResumeText = sanitizeText(parsed.data.rawResumeText);
    if (cleanResumeText.trim().length < 50) {
      return res.status(400).json({
        error: 'Resume text must contain at least 50 characters of valid text.',
      });
    }

    const analysis = await analyzeResumeWithGemini(cleanResumeText);
    const overallTrustScore = calculateTrustScore(analysis.claims);

    // Insert candidate record linked to the authenticated recruiter
    const { data: candidate, error: candidateError } = await req.supabase
      .from('candidates')
      .insert({
        recruiter_id: req.user.id,
        name: analysis.candidateName,
        raw_resume_text: cleanResumeText,
        overall_trust_score: overallTrustScore,
      })
      .select()
      .single();

    if (candidateError || !candidate) {
      console.error('[ResumeController] Candidate insert failed:', candidateError?.message);
      return res.status(500).json({
        error: 'Failed to save candidate analysis. Please verify database configuration.',
      });
    }

    const claimsToInsert = analysis.claims.map((claim) => ({
      candidate_id: candidate.id,
      domain: claim.domain,
      description: claim.description,
      ai_confidence_score: claim.aiConfidenceScore,
      is_flagged: claim.isFlagged,
      ai_reasoning: claim.aiReasoning,
      manual_status: 'PENDING',
    }));

    const { data: insertedClaims, error: claimsError } = await req.supabase
      .from('claims')
      .insert(claimsToInsert)
      .select();

    if (claimsError) {
      console.error('[ResumeController] Claims insert failed:', claimsError.message);
      // Roll back candidate row so no orphaned candidate remains without claims
      await req.supabase
        .from('candidates')
        .delete()
        .eq('id', candidate.id)
        .eq('recruiter_id', req.user.id);

      return res.status(500).json({
        error: 'Failed to persist extracted resume claims.',
      });
    }

    return res.status(201).json({
      candidateId: candidate.id,
      candidate: {
        ...candidate,
        claims: insertedClaims || [],
      },
    });
  } catch (err) {
    console.error('[ResumeController] Analysis failed:', err.message);
    return res.status(500).json({
      error: 'Unable to complete AI resume analysis right now. Please try again.',
    });
  }
}

/**
 * POST /api/resumes/extract-text
 * Extracts plain text from an uploaded .pdf, .txt, or .md resume file
 * so the recruiter can inspect and submit it within the 15,000-character limit.
 */
async function extractResumeText(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No resume file was uploaded.' });
    }

    const { originalname, mimetype, buffer } = req.file;
    const lowerName = (originalname || '').toLowerCase();

    let extracted = '';
    if (mimetype === 'application/pdf' || lowerName.endsWith('.pdf')) {
      const pdfResult = await pdfParse(buffer);
      extracted = pdfResult.text || '';
    } else if (
      mimetype === 'text/plain' ||
      mimetype === 'text/markdown' ||
      lowerName.endsWith('.txt') ||
      lowerName.endsWith('.md')
    ) {
      extracted = buffer.toString('utf8');
    } else {
      return res.status(400).json({
        error: 'Unsupported file type. Please upload a PDF, TXT, or Markdown file.',
      });
    }

    const cleaned = sanitizeText(extracted).replace(/\r\n/g, '\n').trim();
    if (!cleaned) {
      return res.status(400).json({
        error: 'Could not extract readable text from the uploaded file. Try pasting text directly.',
      });
    }

    const truncated = cleaned.length > MAX_RESUME_CHARS;
    const text = truncated ? cleaned.slice(0, MAX_RESUME_CHARS) : cleaned;

    return res.status(200).json({
      text,
      truncated,
      originalLength: cleaned.length,
    });
  } catch (err) {
    console.error('[ResumeController] File text extraction error:', err.message);
    return res.status(400).json({
      error: 'Unable to parse the uploaded file. Please paste the resume text directly.',
    });
  }
}

module.exports = {
  analyzeResume,
  extractResumeText,
};

