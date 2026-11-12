-- Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create candidates table
CREATE TABLE IF NOT EXISTS candidates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recruiter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    raw_resume_text TEXT NOT NULL,
    overall_trust_score INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create claims table
CREATE TABLE IF NOT EXISTS claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE NOT NULL,
    domain VARCHAR(50) NOT NULL, -- EMPLOYMENT_HISTORY, EDUCATION, CERTIFICATIONS, TECHNICAL_SKILLS
    description TEXT NOT NULL,
    ai_confidence_score INTEGER NOT NULL CHECK (ai_confidence_score >= 0 AND ai_confidence_score <= 100), -- 0 to 100
    is_flagged BOOLEAN DEFAULT FALSE,
    ai_reasoning TEXT,
    manual_status VARCHAR(50) DEFAULT 'PENDING' CHECK (manual_status IN ('PENDING', 'VERIFIED', 'REJECTED')), -- PENDING, VERIFIED, REJECTED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Helpful indexes for recruiter isolation and dashboard queries
CREATE INDEX IF NOT EXISTS idx_candidates_recruiter_id ON candidates(recruiter_id);
CREATE INDEX IF NOT EXISTS idx_candidates_created_at ON candidates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_claims_candidate_id ON claims(candidate_id);

-- Automatic updated_at trigger for candidates
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

-- Enable Row Level Security (RLS)
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;

-- RLS Policies for data isolation per recruiter
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

