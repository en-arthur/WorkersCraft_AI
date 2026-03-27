-- Add sandbox_id column to projects table for E2B sandbox persistence
ALTER TABLE projects ADD COLUMN IF NOT EXISTS sandbox_id TEXT;
