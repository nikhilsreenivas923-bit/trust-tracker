/**
 * Calculates an aggregate Trust Score (0-100) for a candidate based on
 * the ratio of high-confidence claims to flagged/suspicious claims,
 * average claim confidence, and recruiter manual verification overrides.
 *
 * @param {Array<Object>} claims - Array of claim objects (supports camelCase or DB snake_case).
 * @returns {number} Integer score clamped between 0 and 100.
 */
function calculateTrustScore(claims) {
  if (!Array.isArray(claims) || claims.length === 0) {
    return 0;
  }

  let confidenceSum = 0;
  let highConfidenceCount = 0;
  let flaggedCount = 0;

  for (const claim of claims) {
    const rawConfidence =
      claim.aiConfidenceScore ?? claim.ai_confidence_score ?? 0;
    const rawFlagged = Boolean(claim.isFlagged ?? claim.is_flagged);
    const manualStatus = claim.manualStatus ?? claim.manual_status ?? 'PENDING';

    let effectiveConfidence = Math.max(0, Math.min(100, Number(rawConfidence) || 0));
    let effectiveFlagged = rawFlagged;

    // Recruiter audit overrides adjust the effective trust assessment
    if (manualStatus === 'VERIFIED') {
      effectiveConfidence = 100;
      effectiveFlagged = false;
    } else if (manualStatus === 'REJECTED') {
      effectiveConfidence = 0;
      effectiveFlagged = true;
    }

    confidenceSum += effectiveConfidence;

    if (effectiveFlagged) {
      flaggedCount += 1;
    } else if (effectiveConfidence >= 70) {
      highConfidenceCount += 1;
    }
  }

  const avgConfidence = confidenceSum / claims.length;
  const decisiveCount = highConfidenceCount + flaggedCount;
  const cleanRatioScore =
    decisiveCount > 0
      ? (highConfidenceCount / decisiveCount) * 100
      : avgConfidence;

  const flagPenalty = flaggedCount > 0 ? Math.min(30, flaggedCount * 6) : 0;
  const rawScore = 0.45 * avgConfidence + 0.55 * cleanRatioScore - flagPenalty;

  return Math.max(0, Math.min(100, Math.round(rawScore)));
}

module.exports = {
  calculateTrustScore,
};

