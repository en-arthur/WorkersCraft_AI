-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  user_prompt TEXT,
  platform TEXT DEFAULT 'web',
  tech_stack TEXT,
  backend_enabled BOOLEAN DEFAULT FALSE,
  backend_status TEXT DEFAULT 'inactive',
  backend_app_id UUID,
  backend_registered_at TIMESTAMP WITH TIME ZONE,
  github_repo_url TEXT,
  github_branch TEXT DEFAULT 'main',
  github_last_synced_at TIMESTAMP WITH TIME ZONE,
  github_last_commit_sha TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_archived BOOLEAN DEFAULT FALSE
);

-- Create project_versions table
CREATE TABLE IF NOT EXISTS project_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  fragment_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  messages JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own projects"
  ON projects FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own project versions"
  ON project_versions FOR ALL
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = project_versions.project_id AND projects.user_id = auth.uid()));

CREATE POLICY "Users can manage their own conversations"
  ON conversations FOR ALL
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = conversations.project_id AND projects.user_id = auth.uid()));

-- Create indexes
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_updated_at ON projects(updated_at DESC);
CREATE INDEX idx_project_versions_project_id ON project_versions(project_id);
CREATE INDEX idx_conversations_project_id ON conversations(project_id);

-- Create user_integrations table
CREATE TABLE IF NOT EXISTS user_integrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  integration_type TEXT NOT NULL,
  access_token TEXT,
  status TEXT DEFAULT 'connected',
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, integration_type)
);

-- Enable RLS for integrations
ALTER TABLE user_integrations ENABLE ROW LEVEL SECURITY;

-- Create policies for integrations
CREATE POLICY "Users can view own integrations"
  ON user_integrations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own integrations"
  ON user_integrations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own integrations"
  ON user_integrations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own integrations"
  ON user_integrations FOR DELETE
  USING (auth.uid() = user_id);

-- Add missing columns to user_integrations for Slack/Telegram
ALTER TABLE user_integrations ADD COLUMN IF NOT EXISTS platform_user_id TEXT;
ALTER TABLE user_integrations ADD COLUMN IF NOT EXISTS platform_team_id TEXT;
ALTER TABLE user_integrations ADD COLUMN IF NOT EXISTS platform_team_name TEXT;

-- Drop old unique constraint and add new one that allows multiple integration types per user
ALTER TABLE user_integrations DROP CONSTRAINT IF EXISTS user_integrations_user_id_integration_type_key;
ALTER TABLE user_integrations ADD CONSTRAINT user_integrations_user_platform_unique UNIQUE(user_id, integration_type, platform_team_id);

-- Create notification_preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  integration_id UUID REFERENCES user_integrations(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(integration_id, notification_type)
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own notification preferences"
  ON notification_preferences FOR ALL
  USING (auth.uid() = user_id);

-- OAuth state table for serverless-safe state verification
CREATE TABLE IF NOT EXISTS oauth_states (
  state TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE oauth_states ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only" ON oauth_states FOR ALL USING (false);
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
