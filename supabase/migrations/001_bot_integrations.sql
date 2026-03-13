-- Enhanced user_integrations table
ALTER TABLE user_integrations ADD COLUMN IF NOT EXISTS platform_user_id VARCHAR(255);
ALTER TABLE user_integrations ADD COLUMN IF NOT EXISTS platform_username VARCHAR(255);
ALTER TABLE user_integrations ADD COLUMN IF NOT EXISTS platform_team_id VARCHAR(255);
ALTER TABLE user_integrations ADD COLUMN IF NOT EXISTS platform_team_name VARCHAR(255);
ALTER TABLE user_integrations ADD COLUMN IF NOT EXISTS refresh_token TEXT;
ALTER TABLE user_integrations ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMP;

-- Create bot_sessions table
CREATE TABLE IF NOT EXISTS bot_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES user_integrations(id) ON DELETE CASCADE,
  platform_thread_id VARCHAR(255),
  active_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  context JSONB DEFAULT '{}',
  state VARCHAR(50) DEFAULT 'idle',
  expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '30 minutes',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bot_sessions_user ON bot_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_bot_sessions_integration ON bot_sessions(integration_id);
CREATE INDEX IF NOT EXISTS idx_bot_sessions_expires ON bot_sessions(expires_at);

-- Create notification_preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  integration_id UUID REFERENCES user_integrations(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, integration_id, notification_type)
);

CREATE INDEX IF NOT EXISTS idx_notification_prefs_user ON notification_preferences(user_id);

-- Create bot_interactions table
CREATE TABLE IF NOT EXISTS bot_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES user_integrations(id) ON DELETE CASCADE,
  interaction_type VARCHAR(50) NOT NULL,
  command VARCHAR(100),
  action VARCHAR(100),
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  response_time_ms INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bot_interactions_user ON bot_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_bot_interactions_created ON bot_interactions(created_at);

-- Create pending_verifications table
CREATE TABLE IF NOT EXISTS pending_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  verification_code VARCHAR(20) UNIQUE NOT NULL,
  integration_type VARCHAR(50) NOT NULL,
  platform_data JSONB DEFAULT '{}',
  status VARCHAR(50) DEFAULT 'pending',
  expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '15 minutes',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pending_verifications_code ON pending_verifications(verification_code);
CREATE INDEX IF NOT EXISTS idx_pending_verifications_expires ON pending_verifications(expires_at);

-- Add unique constraint for platform integrations
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_integrations_platform 
ON user_integrations(user_id, integration_type, platform_user_id);
