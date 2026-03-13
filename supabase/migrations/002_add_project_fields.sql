-- Add deployed_url to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS deployed_url TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS file_count INTEGER DEFAULT 0;
