-- Remove unique constraint (allows same vercel deployment for different users)
ALTER TABLE deployments 
DROP CONSTRAINT IF EXISTS deployments_vercel_deployment_id_key;

-- Add composite unique constraint (vercel_deployment_id + user_id)
ALTER TABLE deployments 
ADD CONSTRAINT deployments_vercel_user_unique 
UNIQUE (vercel_deployment_id, user_id);

-- Delete duplicates for same user
DELETE FROM deployments a
USING deployments b
WHERE a.id < b.id
AND a.vercel_deployment_id = b.vercel_deployment_id
AND a.user_id = b.user_id
AND a.vercel_deployment_id IS NOT NULL;
