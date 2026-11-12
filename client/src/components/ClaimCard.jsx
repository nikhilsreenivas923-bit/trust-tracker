import {
  Briefcase,
  GraduationCap,
  Award,
  Code2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Bot,
} from 'lucide-react';
import { sanitizeOutput } from '../lib/sanitize';

const DOMAIN_META = {
  EMPLOYMENT_HISTORY: {
    label: 'Employment History',
    icon: Briefcase,
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  EDUCATION: {
    label: 'Education',
    icon: GraduationCap,
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  CERTIFICATIONS: {
    label: 'Certifications',
    icon: Award,
    badgeClass: 'bg-teal-50 text-teal-700 border-teal-200',
  },
  TECHNICAL_SKILLS: {
    label: 'Technical Skills',
    icon: Code2,
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
  },
};

const STATUS_META = {
  PENDING: {
    label: 'Pending Audit',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  VERIFIED: {
    label: 'Verified',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  REJECTED: {
    label: 'Rejected',
    badgeClass: 'bg-red-100 text-red-800 border-red-300',
  },
};

export default function ClaimCard({ claim, onUpdateStatus, isUpdating }) {
  const domainInfo = DOMAIN_META[claim.domain] || {
    label: claim.domain,
    icon: Code2,
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
  };
  const DomainIcon = domainInfo.icon;

  const statusInfo = STATUS_META[claim.manual_status] || STATUS_META.PENDING;
  const confidence = Math.max(0, Math.min(100, Number(claim.ai_confidence_score) || 0));

  const isFlagged = Boolean(claim.is_flagged);
  const isRejected = claim.manual_status === 'REJECTED';
  const isVerified = claim.manual_status === 'VERIFIED';

  const safeDescription = sanitizeOutput(claim.description);
  const safeReasoning = sanitizeOutput(claim.ai_reasoning);

  // Visually highlight flagged or rejected claims in red
  const cardClasses =
    isRejected || (isFlagged && !isVerified)
      ? 'border-red-300 bg-red-50/70 shadow-xs'
      : isVerified
      ? 'border-emerald-200 bg-emerald-50/30 shadow-xs'
      : 'border-slate-200 bg-white shadow-xs';

  const barColor =
    confidence > 80
      ? 'bg-emerald-500'
      : confidence >= 50
      ? 'bg-amber-500'
      : 'bg-red-500';

  return (
    <article
      className={`rounded-2xl border p-5 transition-colors ${cardClasses}`}
      data-flagged={isFlagged ? 'true' : 'false'}
    >
      {/* Top Meta Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${domainInfo.badgeClass}`}
          >
            <DomainIcon className="w-3.5 h-3.5" />
            {domainInfo.label}
          </span>

          {isFlagged && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-600 text-white text-xs font-semibold shadow-2xs">
              <AlertTriangle className="w-3.5 h-3.5" />
              AI Red Flag
            </span>
          )}

          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-lg border text-xs font-semibold ${statusInfo.badgeClass}`}
          >
            {statusInfo.label}
          </span>
        </div>

        {/* Confidence Score Meter */}
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-medium text-slate-500">AI Confidence</span>
          <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${barColor}`}
              style={{ width: `${confidence}%` }}
            />
          </div>
          <span
            className={`text-xs font-bold tabular-nums ${
              confidence > 80
                ? 'text-emerald-700'
                : confidence >= 50
                ? 'text-amber-700'
                : 'text-red-700'
            }`}
          >
            {confidence}%
          </span>
        </div>
      </div>

      {/* Claim Statement */}
      <p className="text-sm sm:text-base font-semibold text-slate-900 leading-snug mb-3">
        {safeDescription}
      </p>

      {/* AI Reasoning Advisory */}
      {safeReasoning && (
        <div
          className={`rounded-xl border px-4 py-3 mb-4 ${
            isFlagged
              ? 'bg-red-100/70 border-red-200 text-red-950'
              : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}
        >
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider mb-1 opacity-85">
            <Bot className="w-3.5 h-3.5" />
            <span>AI Reasoning Advisory</span>
          </div>
          <p className="text-xs sm:text-sm leading-relaxed">{safeReasoning}</p>
        </div>
      )}

      {/* Recruiter Manual Audit Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200/70">
        <span className="text-xs font-medium text-slate-500">
          Recruiter Verification Decision
        </span>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={isUpdating || claim.manual_status === 'VERIFIED'}
            onClick={() => onUpdateStatus(claim.id, 'VERIFIED')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              claim.manual_status === 'VERIFIED'
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50'
            } disabled:cursor-default`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Verified
          </button>

          <button
            type="button"
            disabled={isUpdating || claim.manual_status === 'PENDING'}
            onClick={() => onUpdateStatus(claim.id, 'PENDING')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              claim.manual_status === 'PENDING'
                ? 'bg-slate-700 text-white border-slate-700'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
            } disabled:cursor-default`}
          >
            <Clock className="w-3.5 h-3.5" />
            Pending
          </button>

          <button
            type="button"
            disabled={isUpdating || claim.manual_status === 'REJECTED'}
            onClick={() => onUpdateStatus(claim.id, 'REJECTED')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              claim.manual_status === 'REJECTED'
                ? 'bg-red-600 text-white border-red-600'
                : 'bg-white text-red-700 border-red-200 hover:bg-red-50'
            } disabled:cursor-default`}
          >
            <XCircle className="w-3.5 h-3.5" />
            Rejected
          </button>
        </div>
      </div>
    </article>
  );
}

