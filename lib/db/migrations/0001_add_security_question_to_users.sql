-- Migration: 0001_add_security_question_to_users
-- Created: 2026-10-06
-- Description: Add security question fields for password recovery

-- Add security question and answer hash columns to users table
ALTER TABLE users ADD COLUMN security_question TEXT;
ALTER TABLE users ADD COLUMN security_answer_hash TEXT;

-- Create index for users with security questions (optional, for performance)
CREATE INDEX IF NOT EXISTS idx_users_security_question ON users(security_question) WHERE security_question IS NOT NULL;
