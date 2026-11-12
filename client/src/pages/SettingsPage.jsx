import { useEffect, useState } from 'react';
import {
  User,
  Building2,
  Mail,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Server,
} from 'lucide-react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { API_BASE, checkApiHealth } from '../lib/api';

export default function SettingsPage() {
  const { user, updateProfile, signOut } = useAuth();

  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
  const [organization, setOrganization] = useState(
    user?.user_metadata?.organization || ''
  );
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState('');
  const [apiStatus, setApiStatus] = useState({ state: 'checking', message: 'Checking...' });

  useEffect(() => {
    setFullName(user?.user_metadata?.full_name || '');
    setOrganization(user?.user_metadata?.organization || '');
  }, [user]);

  useEffect(() => {
    let active = true;
    checkApiHealth()
      .then((res) => {
        if (!active) return;
        setApiStatus({
          state: 'ok',
          message: `Connected (${res.service || 'API'} · ${new Date(
            res.timestamp
          ).toLocaleTimeString()})`,
        });
      })
      .catch(() => {
        if (!active) return;
        setApiStatus({
          state: 'error',
          message: `Backend API unreachable at ${API_BASE || 'http://localhost:5000'}. Ensure the Express server is running.`,
        });
      });

    return () => {
      active = false;
    };
  }, []);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaveMessage('');
    setSaveError('');

    try {
      setSaving(true);
      await updateProfile({
        fullName: fullName.trim(),
        organization: organization.trim(),
      });
      setSaveMessage('Recruiter profile updated successfully.');
    } catch (err) {
      setSaveError(err.message || 'Failed to update recruiter profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout
      title="Recruiter Settings"
      subtitle="Manage your recruiter profile, security isolation rules, and API connectivity."
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Form */}
        <section className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-8">
          <h2 className="text-base font-semibold text-slate-900 mb-1">
            Recruiter Profile
          </h2>
          <p className="text-xs text-slate-500 mb-6">
            Stored in your Supabase Auth user metadata and displayed across your workspace.
          </p>

          {saveMessage && (
            <div className="mb-5 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs font-medium text-emerald-800">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{saveMessage}</span>
            </div>
          )}

          {saveError && (
            <div className="mb-5 flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs font-medium text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{saveError}</span>
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label
                htmlFor="settings-email"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Account Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="settings-email"
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-500"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="settings-name"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="settings-name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Alex Morgan"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="settings-org"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Organization / Recruiting Team
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="settings-org"
                  type="text"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder="Acme Talent Group"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Recruiter UUID (RLS Tenant Key)
              </label>
              <p className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono text-xs text-slate-600 break-all">
                {user?.id || '—'}
              </p>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={signOut}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Sign Out
              </button>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Changes
              </button>
            </div>
          </form>
        </section>

        {/* System Security & Diagnostics */}
        <aside className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
            <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm mb-3">
              <Server className="w-4 h-4 text-indigo-600" />
              <span>Backend API Status</span>
            </div>
            <div
              className={`rounded-xl border px-3.5 py-3 text-xs font-medium ${
                apiStatus.state === 'ok'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : apiStatus.state === 'error'
                  ? 'bg-red-50 border-red-200 text-red-700'
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              {apiStatus.message}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
            <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm mb-3">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Active Security Controls</span>
            </div>
            <ul className="space-y-2.5 text-xs text-slate-600">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>PostgreSQL Row Level Security (RLS) per recruiter</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Supabase JWT Bearer authentication on all APIs</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Server-side @google/genai execution (no exposed keys)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Zod schema validation & DOMPurify output sanitization</span>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </Layout>
  );
}

