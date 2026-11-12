import { Navigate, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, loading, isConfigured } = useAuth();
  const location = useLocation();

  if (!isConfigured) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white rounded-2xl border border-amber-200 shadow-sm p-8">
          <div className="flex items-center gap-3 text-amber-700 mb-3">
            <ShieldAlert className="w-6 h-6 shrink-0" />
            <h1 className="text-lg font-semibold">Supabase Configuration Required</h1>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            Set <code className="px-1.5 py-0.5 bg-slate-100 rounded text-xs font-mono">SUPABASE_URL</code> and{' '}
            <code className="px-1.5 py-0.5 bg-slate-100 rounded text-xs font-mono">SUPABASE_ANON_KEY</code> in your root{' '}
            <code className="px-1.5 py-0.5 bg-slate-100 rounded text-xs font-mono">.env</code> file (see{' '}
            <code className="px-1.5 py-0.5 bg-slate-100 rounded text-xs font-mono">.env.example</code>) and restart the dev server.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-600">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

