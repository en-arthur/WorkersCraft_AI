-- Add unique constraint to prevent duplicates
ALTER TABLE deployments 
ADD CONSTRAINT deployments_vercel_deployment_id_key 
UNIQUE (vercel_deployment_id);

-- Delete duplicate deployments, keep the one with project_id if exists
DELETE FROM deployments a
USING deployments b
WHERE a.id < b.id
AND a.vercel_deployment_id = b.vercel_deployment_id
AND a.vercel_deployment_id IS NOT NULL
AND (a.project_id IS NULL OR b.project_id IS NOT NULL);
