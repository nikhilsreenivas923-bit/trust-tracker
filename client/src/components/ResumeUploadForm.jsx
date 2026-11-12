import { useRef, useState } from 'react';
import {
  FileText,
  Upload,
  Sparkles,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { extractTextFromFile } from '../lib/api';

const MAX_CHARS = 15000;
const MIN_CHARS = 50;

const SAMPLE_SUSPICIOUS_RESUME = `Marcus Vance
Senior Principal Full-Stack & Mobile Architect
Email: marcus.vance.dev@example.com | San Francisco, CA

SUMMARY
Visionary software architect with 12+ years of production Swift iOS experience (2012-2024) and 10+ years of React.js leadership since 2011.

EXPERIENCE
Principal Software Engineer — Apex Cloud Systems (Jan 2020 – Present, Full-time)
- Architected multi-region Kubernetes clusters serving 50M requests/sec.
- Led a 45-engineer platform team across 4 continents.

Staff Frontend Architect — Nova FinTech Inc. (Mar 2019 – Dec 2022, Full-time)
- Built core banking portal using React 18 and Next.js in 2019.
- Reduced latency by 98% across distributed PostgreSQL shards.

Senior iOS Engineer — BlueWave Mobile (Feb 2012 – Feb 2019)
- Shipped 14 App Store apps written in Swift starting in 2012.

EDUCATION
Ph.D. in Distributed Quantum Computing, Pacific Western Online Institute (2018 – 2019)
B.S. in Computer Science, State University (2008 – 2012)

CERTIFICATIONS
AWS Certified Solutions Architect – Professional (Issued 2023)
CISSP – Certified Information Systems Security Professional (Issued 2022)

TECHNICAL SKILLS
Swift (12 years), React.js (13 years), Rust, Kubernetes, Go, TensorFlow, Solidity`;

const SAMPLE_CLEAN_RESUME = `Elena Rostova
Senior Backend Engineer
San Mateo, CA | elena.rostova@example.com

EXPERIENCE
Senior Backend Engineer — Meridian Payments (May 2021 – Present)
- Designed idempotent payment ledger microservices in Go and PostgreSQL handling 12,000 TPS.
- Reduced p99 checkout latency from 240ms to 85ms through query indexing and Redis caching.

Software Engineer — Horizon Logistics (July 2018 – April 2021)
- Built internal shipment tracking APIs using Node.js, Express, and TypeScript.
- Automated CI/CD pipelines with GitHub Actions and Docker on AWS ECS.

EDUCATION
B.S. in Computer Science, University of Washington (2014 – 2018)

CERTIFICATIONS
AWS Certified Solutions Architect – Associate (Issued 2022)

TECHNICAL SKILLS
Go, TypeScript, Node.js, PostgreSQL, Redis, Docker, Kubernetes, AWS`;

export default function ResumeUploadForm({ onSubmit, isAnalyzing, serverError }) {
  const [rawResumeText, setRawResumeText] = useState('');
  const [localError, setLocalError] = useState('');
  const [extractingFile, setExtractingFile] = useState(false);
  const [fileNotice, setFileNotice] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const charCount = rawResumeText.length;
  const trimmedCount = rawResumeText.trim().length;
  const isTooShort = trimmedCount > 0 && trimmedCount < MIN_CHARS;
  const isTooLong = charCount > MAX_CHARS;
  const canSubmit = !isAnalyzing && !extractingFile && trimmedCount >= MIN_CHARS && !isTooLong;

  const processFile = async (file) => {
    if (!file) return;
    setLocalError('');
    setFileNotice('');

    const lowerName = file.name.toLowerCase();
    const isPlainText =
      file.type === 'text/plain' ||
      file.type === 'text/markdown' ||
      lowerName.endsWith('.txt') ||
      lowerName.endsWith('.md');
    const isPdf = file.type === 'application/pdf' || lowerName.endsWith('.pdf');

    if (!isPlainText && !isPdf) {
      setLocalError('Unsupported file format. Please upload a .pdf, .txt, or .md file.');
      return;
    }

    try {
      setExtractingFile(true);
      if (isPlainText) {
        const text = await file.text();
        const normalized = text.replace(/\r\n/g, '\n').trim();
        if (!normalized) {
          setLocalError('The uploaded text file appears to be empty.');
          return;
        }
        if (normalized.length > MAX_CHARS) {
          setRawResumeText(normalized.slice(0, MAX_CHARS));
          setFileNotice(
            `Loaded "${file.name}" and truncated to ${MAX_CHARS.toLocaleString()} characters.`
          );
        } else {
          setRawResumeText(normalized);
          setFileNotice(`Loaded "${file.name}" (${normalized.length.toLocaleString()} characters).`);
        }
      } else {
        const result = await extractTextFromFile(file);
        setRawResumeText(result.text);
        setFileNotice(
          result.truncated
            ? `Extracted text from "${file.name}" (truncated from ${result.originalLength.toLocaleString()} to ${MAX_CHARS.toLocaleString()} characters).`
            : `Extracted ${result.text.length.toLocaleString()} characters from "${file.name}".`
        );
      }
    } catch (err) {
      setLocalError(err.message || 'Failed to read file. Try pasting the text directly.');
    } finally {
      setExtractingFile(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setLocalError('');

    if (trimmedCount < MIN_CHARS) {
      setLocalError(`Please enter at least ${MIN_CHARS} characters of resume text.`);
      return;
    }
    if (charCount > MAX_CHARS) {
      setLocalError(`Resume text cannot exceed ${MAX_CHARS.toLocaleString()} characters.`);
      return;
    }

    onSubmit(rawResumeText);
  };

  const displayError = localError || serverError;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Sample Quick-Fill Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-100/80 border border-slate-200 rounded-xl px-4 py-3">
        <div className="text-xs text-slate-600">
          <span className="font-semibold text-slate-800">Quick Evaluation:</span>{' '}
          Test claim extraction with sample resumes or upload/paste your own.
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={isAnalyzing}
            onClick={() => {
              setLocalError('');
              setFileNotice('Loaded suspicious sample resume with timeline & experience anomalies.');
              setRawResumeText(SAMPLE_SUSPICIOUS_RESUME);
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-red-200 text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            Load Sample (Red Flags)
          </button>
          <button
            type="button"
            disabled={isAnalyzing}
            onClick={() => {
              setLocalError('');
              setFileNotice('Loaded clean sample engineer resume.');
              setRawResumeText(SAMPLE_CLEAN_RESUME);
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-colors disabled:opacity-50"
          >
            Load Sample (Clean)
          </button>
        </div>
      </div>

      {/* File Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !isAnalyzing && !extractingFile && fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !isAnalyzing && !extractingFile) {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        className={`rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${
          isDragging
            ? 'border-indigo-500 bg-indigo-50/70'
            : 'border-slate-300 bg-white hover:border-indigo-400 hover:bg-slate-50/60'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
          onChange={handleFileChange}
          className="hidden"
          disabled={isAnalyzing || extractingFile}
        />
        <div className="flex flex-col items-center gap-2">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            {extractingFile ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Upload className="w-5 h-5" />
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">
              {extractingFile
                ? 'Extracting text from file...'
                : 'Click to upload a resume or drag & drop'}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Supports PDF, TXT, and Markdown files up to 5 MB (max 15,000 characters)
            </p>
          </div>
        </div>
      </div>

      {fileNotice && (
        <div className="flex items-center gap-2 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{fileNotice}</span>
        </div>
      )}

      {/* Raw Resume Textarea */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label
            htmlFor="raw-resume-text"
            className="flex items-center gap-2 text-sm font-semibold text-slate-800"
          >
            <FileText className="w-4 h-4 text-slate-500" />
            Candidate Resume Text
          </label>
          <span
            className={`text-xs font-mono ${
              isTooLong
                ? 'text-red-600 font-semibold'
                : isTooShort
                ? 'text-amber-600'
                : 'text-slate-500'
            }`}
          >
            {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()} chars
          </span>
        </div>

        <textarea
          id="raw-resume-text"
          rows={14}
          value={rawResumeText}
          disabled={isAnalyzing}
          onChange={(e) => {
            setLocalError('');
            setRawResumeText(e.target.value);
          }}
          placeholder="Paste the candidate's full resume text here (employment history, dates, degrees, certifications, and technical skills)..."
          className={`w-full rounded-2xl border bg-white p-4 text-sm font-mono text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-shadow disabled:bg-slate-50 disabled:text-slate-500 ${
            isTooLong
              ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
              : 'border-slate-300 focus:ring-indigo-500/20 focus:border-indigo-500'
          }`}
        />

        <p className="text-xs text-slate-500 mt-1.5">
          Minimum {MIN_CHARS} characters required. AI analysis checks timeline overlaps, degree legitimacy, and historical technology timelines.
        </p>
      </div>

      {displayError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{displayError}</span>
        </div>
      )}

      {/* Analysis Loading Banner */}
      {isAnalyzing && (
        <div className="rounded-2xl bg-indigo-50 border border-indigo-200 p-5 flex items-center gap-4">
          <Loader2 className="w-6 h-6 text-indigo-600 animate-spin shrink-0" />
          <div>
            <p className="text-sm font-semibold text-indigo-950">
              Analyzing resume claims with Gemini AI...
            </p>
            <p className="text-xs text-indigo-700 mt-0.5">
              Extracting employment, education, certification, and skill claims and running fraud/timeline checks. This typically takes 5–15 seconds.
            </p>
          </div>
        </div>
      )}

      {/* Submit Actions */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          disabled={isAnalyzing || !rawResumeText}
          onClick={() => {
            setRawResumeText('');
            setFileNotice('');
            setLocalError('');
          }}
          className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors"
        >
          Clear Text
        </button>

        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating Trust Report...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Run AI Verification
            </>
          )}
        </button>
      </div>
    </form>
  );
}

