import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import Layout from '../components/Layout';
import ResumeUploadForm from '../components/ResumeUploadForm';
import { analyzeResumeText } from '../lib/api';

export default function NewCandidatePage() {
  const navigate = useNavigate();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [serverError, setServerError] = useState('');

  const handleAnalyze = async (rawResumeText) => {
    try {
      setIsAnalyzing(true);
      setServerError('');
      const result = await analyzeResumeText(rawResumeText);
      navigate(`/candidates/${result.candidateId}`, { replace: true });
    } catch (err) {
      setServerError(
        err.message || 'Unable to analyze resume right now. Please try again.'
      );
      setIsAnalyzing(false);
    }
  };

  return (
    <Layout
      title="New Resume Verification"
      subtitle="Upload a PDF/text resume or paste raw text to extract claims and detect timeline or credential anomalies."
      actions={
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-8">
          <ResumeUploadForm
            onSubmit={handleAnalyze}
            isAnalyzing={isAnalyzing}
            serverError={serverError}
          />
        </div>

        <aside className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
            <div className="flex items-center gap-2.5 text-indigo-600 mb-3">
              <ShieldCheck className="w-5 h-5" />
              <h2 className="text-sm font-semibold text-slate-900">
                What TrustTracker Evaluates
              </h2>
            </div>
            <ul className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <li>
                <strong className="text-slate-800 block">Employment History</strong>
                Detects overlapping full-time roles, inflated scopes, and suspicious tenure gaps.
              </li>
              <li>
                <strong className="text-slate-800 block">Education</strong>
                Evaluates degree timelines and flags unaccredited or diploma-mill institutions.
              </li>
              <li>
                <strong className="text-slate-800 block">Certifications</strong>
                Cross-checks credential plausibility against career seniority (AWS, GCP, Azure, CISSP).
              </li>
              <li>
                <strong className="text-slate-800 block">Technical Skills</strong>
                Catches historically impossible claims (e.g., 10 years of Swift in 2018 or React in 2011).
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </Layout>
  );
}

