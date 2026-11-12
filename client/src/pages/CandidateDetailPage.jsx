import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from 'lucide-react';
import Layout from '../components/Layout';
import TrustScoreBadge from '../components/TrustScoreBadge';
import ClaimCard from '../components/ClaimCard';
import {
  deleteCandidateById,
  fetchCandidateById,
  updateClaimManualStatus,
} from '../lib/api';
import { sanitizeOutput } from '../lib/sanitize';

const DOMAIN_FILTERS = [
  { id: 'ALL', label: 'All Domains' },
  { id: 'EMPLOYMENT_HISTORY', label: 'Employment' },
  { id: 'EDUCATION', label: 'Education' },
  { id: 'CERTIFICATIONS', label: 'Certifications' },
  { id: 'TECHNICAL_SKILLS', label: 'Technical Skills' },
];

export default function CandidateDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingClaimId, setUpdatingClaimId] = useState(null);
  const [actionError, setActionError] = useState('');
  const [domainFilter, setDomainFilter] = useState('ALL');
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [showRawResume, setShowRawResume] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    fetchCandidateById(id)
      .then((data) => {
        if (!active) return;
        setCandidate(data.candidate);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || 'Unable to load candidate report.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  const handleUpdateClaimStatus = async (claimId, manualStatus) => {
    try {
      setUpdatingClaimId(claimId);
      setActionError('');
      const result = await updateClaimManualStatus(claimId, manualStatus);
      setCandidate((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          overall_trust_score: result.overallTrustScore,
          claims: (prev.claims || []).map((c) =>
            c.id === claimId ? result.claim : c
          ),
        };
      });
    } catch (err) {
      setActionError(err.message || 'Failed to update claim status.');
    } finally {
      setUpdatingClaimId(null);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await deleteCandidateById(id);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setActionError(err.message || 'Failed to delete candidate report.');
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const claims = candidate?.claims || [];

  const summary = useMemo(() => {
    const flagged = claims.filter((c) => c.is_flagged);
    const verified = claims.filter((c) => c.manual_status === 'VERIFIED');
    const pending = claims.filter((c) => c.manual_status === 'PENDING');
    const rejected = claims.filter((c) => c.manual_status === 'REJECTED');
    return { flagged, verified, pending, rejected };
  }, [claims]);

  const filteredClaims = useMemo(() => {
    return claims.filter((c) => {
      const matchesDomain = domainFilter === 'ALL' || c.domain === domainFilter;
      const matchesFlagged = !flaggedOnly || c.is_flagged;
      return matchesDomain && matchesFlagged;
    });
  }, [claims, domainFilter, flaggedOnly]);

  const safeCandidateName =
    sanitizeOutput(candidate?.name) || 'Candidate Report';
  const safeRawResume = sanitizeOutput(candidate?.raw_resume_text);

  return (
    <Layout
      title={loading ? 'Loading Report...' : safeCandidateName}
      subtitle={
        candidate
          ? `Analyzed ${new Date(candidate.created_at).toLocaleString()} · ${claims.length} extracted claims`
          : 'Trust & Verification Report'
      }
      actions={
        <div className="flex items-center gap-2.5">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </Link>

          {candidate && !confirmDelete && (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-red-200 bg-white text-sm font-medium text-red-700 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          )}

          {candidate && confirmDelete && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-1.5">
              <span className="text-xs font-semibold text-red-800">Delete report?</span>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDelete}
                className="px-2.5 py-1 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Confirm'}
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => setConfirmDelete(false)}
                className="px-2 py-1 rounded-lg text-xs font-medium text-slate-600 hover:bg-white"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      }
    >
      {loading && (
        <div className="space-y-4">
          <div className="h-32 bg-white rounded-2xl border border-slate-200 animate-pulse" />
          <div className="h-44 bg-white rounded-2xl border border-slate-200 animate-pulse" />
          <div className="h-44 bg-white rounded-2xl border border-slate-200 animate-pulse" />
        </div>
      )}

      {!loading && error && (
        <div
          role="alert"
          className="rounded-2xl bg-red-50 border border-red-200 p-6 flex items-start gap-3 text-red-800"
        >
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <h2 className="font-semibold text-sm">Could not load candidate report</h2>
            <p className="text-sm mt-1">{error}</p>
            <Link
              to="/dashboard"
              className="mt-3 inline-block text-xs font-semibold underline"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      )}

      {!loading && candidate && (
        <div className="space-y-6">
          {/* Report Summary Header Card */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Aggregate Trust Assessment
              </span>
              <div className="flex flex-wrap items-center gap-3">
                <TrustScoreBadge score={candidate.overall_trust_score} size="lg" />
              </div>
              <p className="text-xs text-slate-500">
                Calculated from AI claim confidence, flagged anomaly ratio, and your manual verification updates.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-center">
                <div className="flex items-center justify-center gap-1 text-red-700 text-xs font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Flagged
                </div>
                <p className="text-xl font-bold text-red-800 mt-1 tabular-nums">
                  {summary.flagged.length}
                </p>
              </div>
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-center">
                <div className="flex items-center justify-center gap-1 text-emerald-700 text-xs font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Verified
                </div>
                <p className="text-xl font-bold text-emerald-800 mt-1 tabular-nums">
                  {summary.verified.length}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-center">
                <div className="flex items-center justify-center gap-1 text-slate-600 text-xs font-semibold">
                  <Clock className="w-3.5 h-3.5" />
                  Pending
                </div>
                <p className="text-xl font-bold text-slate-800 mt-1 tabular-nums">
                  {summary.pending.length}
                </p>
              </div>
              <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-center">
                <div className="flex items-center justify-center gap-1 text-rose-700 text-xs font-semibold">
                  <XCircle className="w-3.5 h-3.5" />
                  Rejected
                </div>
                <p className="text-xl font-bold text-rose-800 mt-1 tabular-nums">
                  {summary.rejected.length}
                </p>
              </div>
            </div>
          </section>

          {/* Red Flag Alert Summary */}
          {summary.flagged.length > 0 && (
            <section className="rounded-2xl bg-red-50 border border-red-300 p-5">
              <div className="flex items-center gap-2 text-red-800 font-semibold text-sm mb-2">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                <span>
                  {summary.flagged.length}{' '}
                  {summary.flagged.length === 1 ? 'Claim Flagged' : 'Claims Flagged'} for
                  Recruiter Audit
                </span>
              </div>
              <p className="text-xs text-red-700 mb-3">
                Review the AI Reasoning advisories below and verify or reject each flagged claim before advancing the candidate.
              </p>
              <ul className="space-y-1.5 text-xs text-red-900 list-disc list-inside">
                {summary.flagged.map((flag) => (
                  <li key={flag.id}>
                    <span className="font-semibold">
                      {sanitizeOutput(flag.description)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {actionError && (
            <div
              role="alert"
              className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          {/* Claim Domain Filters */}
          <section className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {DOMAIN_FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setDomainFilter(f.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                    domainFilter === f.id
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setFlaggedOnly((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                flaggedOnly
                  ? 'bg-red-600 text-white border-red-600'
                  : 'bg-white text-red-700 border-red-200 hover:bg-red-50'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Flagged Only ({summary.flagged.length})
            </button>
          </section>

          {/* Claims List */}
          <section className="space-y-4">
            {filteredClaims.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-500">
                No claims match the selected filter.
              </div>
            ) : (
              filteredClaims.map((claim) => (
                <ClaimCard
                  key={claim.id}
                  claim={claim}
                  isUpdating={updatingClaimId === claim.id}
                  onUpdateStatus={handleUpdateClaimStatus}
                />
              ))
            )}
          </section>

          {/* Collapsible Raw Resume Text */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <button
              type="button"
              onClick={() => setShowRawResume((prev) => !prev)}
              className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
            >
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Original Raw Resume Text
                </h2>
                <p className="text-xs text-slate-500">
                  Sanitized text ingested for Gemini claim verification
                </p>
              </div>
              {showRawResume ? (
                <ChevronUp className="w-5 h-5 text-slate-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-500" />
              )}
            </button>

            {showRawResume && (
              <div className="px-6 pb-6 border-t border-slate-200 pt-4">
                <pre className="whitespace-pre-wrap font-mono text-xs text-slate-700 bg-slate-50 rounded-xl border border-slate-200 p-4 max-h-96 overflow-y-auto">
                  {safeRawResume}
                </pre>
              </div>
            )}
          </section>
        </div>
      )}
    </Layout>
  );
}

