import { supabase } from './supabase';

export const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

async function getAccessToken() {
  if (!supabase) {
    throw new Error('Supabase client is not configured. Check your .env file.');
  }
  const { data, error } = await supabase.auth.getSession();
  if (error || !data?.session?.access_token) {
    throw new Error('Your session has expired. Please sign in again.');
  }
  return data.session.access_token;
}

async function apiRequest(path, options = {}) {
  const token = await getAccessToken();
  const headers = {
    Authorization: `Bearer ${token}`,
    ...(options.headers || {}),
  };

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  let payload = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    payload = await response.json();
  }

  if (!response.ok) {
    throw new Error(
      payload?.error || `Request failed with status ${response.status}.`
    );
  }

  return payload;
}

export async function fetchCandidates() {
  return apiRequest('/api/candidates', { method: 'GET' });
}

export async function fetchCandidateById(candidateId) {
  return apiRequest(`/api/candidates/${encodeURIComponent(candidateId)}`, {
    method: 'GET',
  });
}

export async function deleteCandidateById(candidateId) {
  return apiRequest(`/api/candidates/${encodeURIComponent(candidateId)}`, {
    method: 'DELETE',
  });
}

export async function analyzeResumeText(rawResumeText) {
  return apiRequest('/api/resumes/analyze', {
    method: 'POST',
    body: JSON.stringify({ rawResumeText }),
  });
}

export async function extractTextFromFile(file) {
  const formData = new FormData();
  formData.append('resumeFile', file);

  return apiRequest('/api/resumes/extract-text', {
    method: 'POST',
    body: formData,
  });
}

export async function updateClaimManualStatus(claimId, manualStatus) {
  return apiRequest(`/api/claims/${encodeURIComponent(claimId)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ manualStatus }),
  });
}

export async function checkApiHealth() {
  const response = await fetch(`${API_BASE}/api/health`);
  if (!response.ok) {
    throw new Error('Backend API unavailable.');
  }
  return response.json();
}

