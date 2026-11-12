import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FilePlus2,
  Users,
  ShieldCheck,
  AlertOctagon,
  CheckCircle2,
  Search,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import Layout from '../components/Layout';
import CandidateTable from '../components/CandidateTable';
import { fetchCandidates } from '../lib/api';

export default function DashboardPage() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState('ALL'); // ALL | HIGH | MODERATE | RISK

  const loadCandidates = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await fetchCandidates();
      setCandidates(data.candidates || []);
    } catch (err) {
      setError(err.message || 'Unable to load candidate reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCandidates();
  }, []);

  const metrics = useMemo(() => {
    const total = candidates.length;
    if (total === 0) {
      return {
        totalCandidates: 0,
        avgTrustScore: 0,
        totalFlags: 0,
        totalVerified: 0,
      };
    }

    const scoreSum = candidates.reduce(
      (sum, c) => sum + (Number(c.overall_trust_score) || 0),
      0
    );
    const totalFlags = candidates.reduce(
      (sum, c) => sum + (c.stats?.flaggedClaims || 0),
      0
    );
    const totalVerified = candidates.reduce(
      (sum, c) => sum + (c.stats?.verifiedClaims || 0),
      0
    );

    return {
      totalCandidates: total,
      avgTrustScore: Math.round(scoreSum / total),
      totalFlags,
      totalVerified,
    };
  }, [candidates]);

  const filteredCandidates = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return candidates.filter((c) => {
      const matchesName = !query || (c.name || '').toLowerCase().includes(query);
      const score = Number(c.overall_trust_score) || 0;
      const matchesTier =
        tierFilter === 'ALL' ||
        (tierFilter === 'HIGH' && score > 80) ||
        (tierFilter === 'MODERATE' && score >= 50 && score <= 80) ||
        (tierFilter === 'RISK' && score < 50);
      return matchesName && matchesTier;
    });
  }, [candidates, searchQuery, tierFilter]);

  return (
    <Layout
      title="Recruiter Trust Dashboard"
      subtitle="Monitor candidate verification reports, aggregate trust scores, and AI-flagged anomalies."
      actions={
        <Link
          to="/candidates/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold shadow-sm hover:bg-indigo-700 transition-colors"
        >
          <FilePlus2 className="w-4 h-4" />
          New Resume Audit
        </Link>
      }
    >
      {/* KPI Overview */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Candidates Audited</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-3xl font-bold text-slate-900 mt-2 tabular-nums">
            {metrics.totalCandidates}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Avg Trust Score</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-3xl font-bold text-slate-900 mt-2 tabular-nums">
            {metrics.totalCandidates > 0 ? `${metrics.avgTrustScore}/100` : '—'}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>AI Red Flags</span>
            <AlertOctagon className="w-4 h-4 text-red-600" />
          </div>
          <p className="text-3xl font-bold text-red-600 mt-2 tabular-nums">
            {metrics.totalFlags}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Manually Verified</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-3xl font-bold text-slate-900 mt-2 tabular-nums">
            {metrics.totalVerified}
          </p>
        </div>
      </section>

      {/* Search & Filter Controls */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search candidates by name..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'ALL', label: 'All Tiers' },
            { id: 'HIGH', label: 'High Trust (>80)' },
            { id: 'MODERATE', label: 'Moderate (50–80)' },
            { id: 'RISK', label: 'High Risk (<50)' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTierFilter(tab.id)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                tierFilter === tab.id
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}

          <button
            type="button"
            onClick={loadCandidates}
            disabled={loading}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
            title="Refresh dashboard"
            aria-label="Refresh dashboard"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </section>

      {/* Error State */}
      {error && (
        <div
          role="alert"
          className="mb-6 flex items-center justify-between gap-3 rounded-2xl bg-red-50 border border-red-200 px-5 py-4 text-sm text-red-700"
        >
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={loadCandidates}
            className="px-3 py-1.5 rounded-lg bg-white border border-red-200 text-xs font-semibold text-red-700 hover:bg-red-100"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton or Table */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 space-y-4">
          {[1, 2, 3].map((row) => (
            <div key={row} className="h-12 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <CandidateTable candidates={filteredCandidates} />
      )}
    </Layout>
  );
}

