import { Link } from 'react-router-dom';
import {
  AlertOctagon,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileSearch,
} from 'lucide-react';
import TrustScoreBadge from './TrustScoreBadge';
import { sanitizeOutput } from '../lib/sanitize';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function CandidateTable({ candidates }) {
  if (!candidates || candidates.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
          <FileSearch className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-900">
          No candidate reports yet
        </h3>
        <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
          Paste or upload a candidate resume to extract verifiable claims, surface
          timeline inconsistencies, and calculate an aggregate Trust Score.
        </p>
        <Link
          to="/candidates/new"
          className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          Analyze First Resume
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
              >
                Candidate
              </th>
              <th
                scope="col"
                className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
              >
                Trust Score
              </th>
              <th
                scope="col"
                className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
              >
                Claims & Flags
              </th>
              <th
                scope="col"
                className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
              >
                Audit Progress
              </th>
              <th
                scope="col"
                className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
              >
                Analyzed
              </th>
              <th scope="col" className="relative px-6 py-3.5">
                <span className="sr-only">View Report</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {candidates.map((candidate) => {
              const safeName = sanitizeOutput(candidate.name) || 'Unknown Candidate';
              const stats = candidate.stats || {
                totalClaims: 0,
                flaggedClaims: 0,
                verifiedClaims: 0,
                pendingClaims: 0,
              };

              return (
                <tr
                  key={candidate.id}
                  className="hover:bg-slate-50/80 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      to={`/candidates/${candidate.id}`}
                      className="text-sm font-semibold text-slate-900 hover:text-indigo-600 transition-colors"
                    >
                      {safeName}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <TrustScoreBadge
                      score={candidate.overall_trust_score}
                      size="sm"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-medium">
                        {stats.totalClaims} claims
                      </span>
                      {stats.flaggedClaims > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-red-50 text-red-700 font-semibold border border-red-200">
                          <AlertOctagon className="w-3.5 h-3.5" />
                          {stats.flaggedClaims} flagged
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          0 flags
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {stats.verifiedClaims} verified
                      </span>
                      <span className="inline-flex items-center gap-1 text-slate-500">
                        <Clock className="w-3.5 h-3.5" />
                        {stats.pendingClaims} pending
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {formatDate(candidate.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      to={`/candidates/${candidate.id}`}
                      className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 font-semibold"
                    >
                      Review
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

