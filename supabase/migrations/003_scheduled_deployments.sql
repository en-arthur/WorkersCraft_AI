-- Scheduled deployments table
CREATE TABLE IF NOT EXISTS scheduled_deployments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  cron_expression VARCHAR(100) NOT NULL, -- e.g. '0 17 * * 5' (every Friday 5pm)
  label VARCHAR(255), -- e.g. 'Every Friday at 5pm'
  enabled BOOLEAN DEFAULT true,
  last_run_at TIMESTAMP,
  next_run_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_deployments_user ON scheduled_deployments(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_deployments_next_run ON scheduled_deployments(next_run_at) WHERE enabled = true;
