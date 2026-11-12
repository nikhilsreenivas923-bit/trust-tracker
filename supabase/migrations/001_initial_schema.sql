-- ============================================================================
-- TrustTracker AI — Initial Supabase Cloud PostgreSQL Schema, RLS & Seed Data
-- Migration: 001_initial_schema.sql
-- ============================================================================

-- 1. Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tables
-- Create candidates table
CREATE TABLE IF NOT EXISTS candidates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recruiter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    raw_resume_text TEXT NOT NULL,
    overall_trust_score INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create claims table
CREATE TABLE IF NOT EXISTS claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
    domain VARCHAR(50) NOT NULL, -- EMPLOYMENT_HISTORY, EDUCATION, CERTIFICATIONS, TECHNICAL_SKILLS
    description TEXT NOT NULL,
    ai_confidence_score INTEGER NOT NULL CHECK (ai_confidence_score >= 0 AND ai_confidence_score <= 100), -- 0 to 100
    is_flagged BOOLEAN DEFAULT FALSE,
    ai_reasoning TEXT,
    manual_status VARCHAR(50) DEFAULT 'PENDING' CHECK (manual_status IN ('PENDING', 'VERIFIED', 'REJECTED')), -- PENDING, VERIFIED, REJECTED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Indexes & Updated Timestamp Trigger
CREATE INDEX IF NOT EXISTS idx_candidates_recruiter_id ON candidates(recruiter_id);
CREATE INDEX IF NOT EXISTS idx_candidates_created_at ON candidates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_claims_candidate_id ON claims(candidate_id);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_candidates_updated_at ON candidates;
CREATE TRIGGER update_candidates_updated_at
    BEFORE UPDATE ON candidates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 4. Row Level Security (RLS) / Data Isolation Rules
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Recruiters can manage their own candidates" ON candidates;
CREATE POLICY "Recruiters can manage their own candidates"
ON candidates FOR ALL
USING (auth.uid() = recruiter_id)
WITH CHECK (auth.uid() = recruiter_id);

DROP POLICY IF EXISTS "Recruiters can manage claims of their candidates" ON claims;
CREATE POLICY "Recruiters can manage claims of their candidates"
ON claims FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM candidates
        WHERE candidates.id = claims.candidate_id
        AND candidates.recruiter_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM candidates
        WHERE candidates.id = claims.candidate_id
        AND candidates.recruiter_id = auth.uid()
    )
);

-- 5. Idempotent Seed Data (links to the first existing auth.users recruiter if present)
DO $$
DECLARE
    v_recruiter_id UUID;
    v_candidate_flagged UUID := '11111111-1111-4111-8111-111111111101';
    v_candidate_clean   UUID := '11111111-1111-4111-8111-111111111102';
BEGIN
    SELECT id INTO v_recruiter_id
    FROM auth.users
    ORDER BY created_at ASC
    LIMIT 1;

    IF v_recruiter_id IS NULL THEN
        RAISE NOTICE 'Skipping SQL seed rows: no user found in auth.users yet. Run `npm run db:seed` or sign up a recruiter and re-run.';
        RETURN;
    END IF;

    -- Seed Candidate 1: High-risk resume with impossible skill timelines and overlapping roles
    INSERT INTO candidates (id, recruiter_id, name, raw_resume_text, overall_trust_score)
    VALUES (
        v_candidate_flagged,
        v_recruiter_id,
        'Marcus Vance',
        E'Marcus Vance\nSenior Principal Full-Stack & Mobile Architect\n\nSUMMARY\n12+ years of production Swift iOS experience (2012-2024) and 10+ years of React.js leadership since 2011.\n\nEXPERIENCE\nPrincipal Software Engineer — Apex Cloud Systems (Jan 2020 – Present, Full-time)\nStaff Frontend Architect — Nova FinTech Inc. (Mar 2019 – Dec 2022, Full-time)\n\nEDUCATION\nPh.D. in Distributed Quantum Computing, Pacific Western Online Institute (2018 – 2019)\n\nCERTIFICATIONS\nAWS Certified Solutions Architect – Professional (Issued 2023)\n\nTECHNICAL SKILLS\nSwift (12 years), React.js (13 years), Kubernetes, Go',
        0
    )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO claims (id, candidate_id, domain, description, ai_confidence_score, is_flagged, ai_reasoning, manual_status)
    VALUES
        (
            '22222222-2222-4222-8222-222222222101',
            v_candidate_flagged,
            'TECHNICAL_SKILLS',
            'Claims 12+ years of production Swift iOS experience starting in 2012',
            10,
            TRUE,
            'Swift was publicly introduced by Apple in June 2014, making production Swift experience starting in 2012 historically impossible.',
            'PENDING'
        ),
        (
            '22222222-2222-4222-8222-222222222102',
            v_candidate_flagged,
            'TECHNICAL_SKILLS',
            'Claims React.js leadership experience starting in 2011',
            15,
            TRUE,
            'React was open-sourced by Facebook in May 2013, so claiming external production leadership in 2011 is inconsistent with technology history.',
            'PENDING'
        ),
        (
            '22222222-2222-4222-8222-222222222103',
            v_candidate_flagged,
            'EMPLOYMENT_HISTORY',
            'Full-time Principal Software Engineer at Apex Cloud Systems (Jan 2020 – Present) overlapping with full-time Staff Frontend Architect at Nova FinTech Inc. (Mar 2019 – Dec 2022)',
            22,
            TRUE,
            'Simultaneous full-time senior engineering roles across nearly 3 years without explanation indicates potential timeline fabrication or undisclosed concurrent employment.',
            'PENDING'
        ),
        (
            '22222222-2222-4222-8222-222222222104',
            v_candidate_flagged,
            'EDUCATION',
            'Ph.D. in Distributed Quantum Computing, Pacific Western Online Institute (2018 – 2019)',
            18,
            TRUE,
            'A 1-year doctoral degree from an unaccredited or known diploma-mill-style institution is highly anomalous and warrants direct credential verification.',
            'PENDING'
        ),
        (
            '22222222-2222-4222-8222-222222222105',
            v_candidate_flagged,
            'CERTIFICATIONS',
            'AWS Certified Solutions Architect – Professional (Issued 2023)',
            78,
            FALSE,
            'Plausible certification date and vendor, though AWS credential ID should still be verified via Credly/AWS transcript.',
            'PENDING'
        )
    ON CONFLICT (id) DO NOTHING;

    -- Seed Candidate 2: High-trust consistent senior backend profile
    INSERT INTO candidates (id, recruiter_id, name, raw_resume_text, overall_trust_score)
    VALUES (
        v_candidate_clean,
        v_recruiter_id,
        'Elena Rostova',
        E'Elena Rostova\nSenior Backend Engineer\n\nEXPERIENCE\nSenior Backend Engineer — Meridian Payments (May 2021 – Present)\nSoftware Engineer — Horizon Logistics (July 2018 – April 2021)\n\nEDUCATION\nB.S. in Computer Science, University of Washington (2014 – 2018)\n\nCERTIFICATIONS\nAWS Certified Solutions Architect – Associate (Issued 2022)\n\nTECHNICAL SKILLS\nGo, TypeScript, Node.js, PostgreSQL, Redis, Docker, Kubernetes, AWS',
        98
    )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO claims (id, candidate_id, domain, description, ai_confidence_score, is_flagged, ai_reasoning, manual_status)
    VALUES
        (
            '22222222-2222-4222-8222-222222222201',
            v_candidate_clean,
            'EMPLOYMENT_HISTORY',
            'Senior Backend Engineer at Meridian Payments (May 2021 – Present)',
            92,
            FALSE,
            'Continuous progression following prior 3-year Software Engineer role with realistic scope and zero timeline overlap.',
            'VERIFIED'
        ),
        (
            '22222222-2222-4222-8222-222222222202',
            v_candidate_clean,
            'EMPLOYMENT_HISTORY',
            'Software Engineer at Horizon Logistics (July 2018 – April 2021)',
            94,
            FALSE,
            'Start date aligns directly after May/June 2018 university graduation.',
            'VERIFIED'
        ),
        (
            '22222222-2222-4222-8222-222222222203',
            v_candidate_clean,
            'EDUCATION',
            'B.S. in Computer Science, University of Washington (2014 – 2018)',
            95,
            FALSE,
            'Standard 4-year accredited undergraduate degree matching subsequent career progression.',
            'VERIFIED'
        ),
        (
            '22222222-2222-4222-8222-222222222204',
            v_candidate_clean,
            'CERTIFICATIONS',
            'AWS Certified Solutions Architect – Associate (Issued 2022)',
            89,
            FALSE,
            'Certification level and timing match backend cloud experience.',
            'PENDING'
        ),
        (
            '22222222-2222-4222-8222-222222222205',
            v_candidate_clean,
            'TECHNICAL_SKILLS',
            'Go, TypeScript, Node.js, PostgreSQL, Redis, Docker, Kubernetes, AWS',
            93,
            FALSE,
            'Cohesive backend infrastructure stack consistent with listed employment duties and timeline.',
            'PENDING'
        )
    ON CONFLICT (id) DO NOTHING;
END $$;
