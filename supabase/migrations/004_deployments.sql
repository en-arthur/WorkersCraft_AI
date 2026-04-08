-- Deployments table
CREATE TABLE IF NOT EXISTS deployments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Deployment type
  type TEXT NOT NULL CHECK (type IN ('web', 'android', 'ios')),
  platform TEXT CHECK (platform IN ('vercel', 'github-actions')),
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'building', 'success', 'failed')),
  
  -- URLs and artifacts
  deployment_url TEXT,
  artifact_url TEXT,
  build_type TEXT CHECK (build_type IN ('debug', 'release')),
  
  -- Metadata
  commit_sha TEXT,
  branch TEXT DEFAULT 'main',
  build_logs TEXT,
  error_message TEXT,
  
  -- External IDs
  vercel_deployment_id TEXT,
  github_run_id TEXT,
  
  -- Timestamps
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_deployments_project ON deployments(project_id);
CREATE INDEX idx_deployments_user ON deployments(user_id);
CREATE INDEX idx_deployments_status ON deployments(status);
CREATE INDEX idx_deployments_type ON deployments(type);
