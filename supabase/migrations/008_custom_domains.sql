-- Add custom domain columns to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS custom_domain TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS domain_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS domain_added_at TIMESTAMP WITH TIME ZONE;

-- Add custom domain columns to deployments table
ALTER TABLE deployments ADD COLUMN IF NOT EXISTS custom_domain TEXT;

-- Create index for custom domains
CREATE INDEX IF NOT EXISTS idx_projects_custom_domain ON projects(custom_domain) WHERE custom_domain IS NOT NULL;
