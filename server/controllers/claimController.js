const {
  uuidParamSchema,
  updateClaimStatusSchema,
} = require('../utils/validationSchemas');
const { calculateTrustScore } = require('../services/trustScoreService');

/**
 * PATCH /api/claims/:id/status
 * Updates manual_status (PENDING | VERIFIED | REJECTED) for a claim owned by the recruiter
 * and recalculates the parent candidate's overall_trust_score.
 */
async function updateClaimStatus(req, res) {
  try {
    const idValidation = uuidParamSchema.safeParse(req.params.id);
    if (!idValidation.success) {
      return res.status(400).json({ error: 'Invalid claim ID format.' });
    }

    const bodyValidation = updateClaimStatusSchema.safeParse(req.body);
    if (!bodyValidation.success) {
      const message =
        bodyValidation.error.issues[0]?.message || 'Invalid manual status value.';
      return res.status(400).json({ error: message });
    }

    const claimId = idValidation.data;
    const { manualStatus } = bodyValidation.data;

    // Fetch existing claim and verify parent candidate ownership
    const { data: existingClaim, error: fetchError } = await req.supabase
      .from('claims')
      .select(
        `
        id,
        candidate_id,
        candidates!inner (
          id,
          recruiter_id
        )
      `
      )
      .eq('id', claimId)
      .maybeSingle();

    if (fetchError) {
      console.error('[ClaimController] Fetch claim error:', fetchError.message);
      return res.status(500).json({ error: 'Failed to locate claim.' });
    }

    if (
      !existingClaim ||
      existingClaim.candidates?.recruiter_id !== req.user.id
    ) {
      return res.status(404).json({ error: 'Claim not found.' });
    }

    const { data: updatedClaim, error: updateError } = await req.supabase
      .from('claims')
      .update({ manual_status: manualStatus })
      .eq('id', claimId)
      .select()
      .single();

    if (updateError || !updatedClaim) {
      console.error('[ClaimController] Update claim error:', updateError?.message);
      return res.status(500).json({ error: 'Failed to update claim status.' });
    }

    // Recompute candidate aggregate Trust Score reflecting manual recruiter audits
    const { data: candidateClaims, error: claimsFetchError } = await req.supabase
      .from('claims')
      .select('ai_confidence_score, is_flagged, manual_status')
      .eq('candidate_id', existingClaim.candidate_id);

    if (claimsFetchError) {
      console.error(
        '[ClaimController] Recompute score fetch error:',
        claimsFetchError.message
      );
      return res.status(500).json({
        error: 'Claim updated, but failed to recalculate candidate Trust Score.',
      });
    }

    const overallTrustScore = calculateTrustScore(candidateClaims || []);

    const { error: scoreUpdateError } = await req.supabase
      .from('candidates')
      .update({
        overall_trust_score: overallTrustScore,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingClaim.candidate_id)
      .eq('recruiter_id', req.user.id);

    if (scoreUpdateError) {
      console.error(
        '[ClaimController] Candidate score update error:',
        scoreUpdateError.message
      );
      return res.status(500).json({
        error: 'Claim updated, but failed to save updated Trust Score.',
      });
    }

    return res.status(200).json({
      claim: updatedClaim,
      overallTrustScore,
    });
  } catch (err) {
    console.error('[ClaimController] updateClaimStatus exception:', err.message);
    return res.status(500).json({ error: 'Failed to update claim status.' });
  }
}

module.exports = {
  updateClaimStatus,
};

