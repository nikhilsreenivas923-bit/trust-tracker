const { uuidParamSchema } = require('../utils/validationSchemas');

/**
 * GET /api/candidates
 * Returns all candidates belonging to the authenticated recruiter with claim summary metrics.
 */
async function listCandidates(req, res) {
  try {
    const { data, error } = await req.supabase
      .from('candidates')
      .select(
        `
        id,
        recruiter_id,
        name,
        overall_trust_score,
        created_at,
        updated_at,
        claims (
          id,
          domain,
          is_flagged,
          manual_status,
          ai_confidence_score
        )
      `
      )
      .eq('recruiter_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[CandidateController] listCandidates error:', error.message);
      return res.status(500).json({ error: 'Failed to retrieve candidates.' });
    }

    const candidates = (data || []).map((candidate) => {
      const claims = Array.isArray(candidate.claims) ? candidate.claims : [];
      const totalClaims = claims.length;
      const flaggedClaims = claims.filter((c) => c.is_flagged).length;
      const verifiedClaims = claims.filter((c) => c.manual_status === 'VERIFIED').length;
      const rejectedClaims = claims.filter((c) => c.manual_status === 'REJECTED').length;
      const pendingClaims = claims.filter((c) => c.manual_status === 'PENDING').length;

      return {
        id: candidate.id,
        recruiter_id: candidate.recruiter_id,
        name: candidate.name,
        overall_trust_score: candidate.overall_trust_score,
        created_at: candidate.created_at,
        updated_at: candidate.updated_at,
        stats: {
          totalClaims,
          flaggedClaims,
          verifiedClaims,
          rejectedClaims,
          pendingClaims,
        },
      };
    });

    return res.status(200).json({ candidates });
  } catch (err) {
    console.error('[CandidateController] listCandidates exception:', err.message);
    return res.status(500).json({ error: 'Failed to retrieve candidates.' });
  }
}

/**
 * GET /api/candidates/:id
 * Returns full details and claims for a specific candidate owned by the recruiter.
 */
async function getCandidateById(req, res) {
  try {
    const idValidation = uuidParamSchema.safeParse(req.params.id);
    if (!idValidation.success) {
      return res.status(400).json({ error: 'Invalid candidate ID format.' });
    }

    const candidateId = idValidation.data;

    const { data: candidate, error: candidateError } = await req.supabase
      .from('candidates')
      .select('*')
      .eq('id', candidateId)
      .eq('recruiter_id', req.user.id)
      .maybeSingle();

    if (candidateError) {
      console.error('[CandidateController] getCandidateById error:', candidateError.message);
      return res.status(500).json({ error: 'Failed to load candidate report.' });
    }

    if (!candidate) {
      return res.status(404).json({ error: 'Candidate report not found.' });
    }

    const { data: claims, error: claimsError } = await req.supabase
      .from('claims')
      .select('*')
      .eq('candidate_id', candidateId)
      .order('is_flagged', { ascending: false })
      .order('created_at', { ascending: true });

    if (claimsError) {
      console.error('[CandidateController] claims query error:', claimsError.message);
      return res.status(500).json({ error: 'Failed to load candidate claims.' });
    }

    return res.status(200).json({
      candidate: {
        ...candidate,
        claims: claims || [],
      },
    });
  } catch (err) {
    console.error('[CandidateController] getCandidateById exception:', err.message);
    return res.status(500).json({ error: 'Failed to load candidate report.' });
  }
}

/**
 * DELETE /api/candidates/:id
 * Deletes a candidate report and cascades its claims.
 */
async function deleteCandidateById(req, res) {
  try {
    const idValidation = uuidParamSchema.safeParse(req.params.id);
    if (!idValidation.success) {
      return res.status(400).json({ error: 'Invalid candidate ID format.' });
    }

    const candidateId = idValidation.data;

    const { data, error } = await req.supabase
      .from('candidates')
      .delete()
      .eq('id', candidateId)
      .eq('recruiter_id', req.user.id)
      .select('id')
      .maybeSingle();

    if (error) {
      console.error('[CandidateController] deleteCandidateById error:', error.message);
      return res.status(500).json({ error: 'Failed to delete candidate report.' });
    }

    if (!data) {
      return res.status(404).json({ error: 'Candidate report not found.' });
    }

    return res.status(200).json({ deletedId: data.id });
  } catch (err) {
    console.error('[CandidateController] deleteCandidateById exception:', err.message);
    return res.status(500).json({ error: 'Failed to delete candidate report.' });
  }
}

module.exports = {
  listCandidates,
  getCandidateById,
  deleteCandidateById,
};

