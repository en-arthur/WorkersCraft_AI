-- Check deployment records
SELECT id, project_id, vercel_deployment_id, deployment_url, status, created_at 
FROM deployments 
ORDER BY created_at DESC 
LIMIT 10;

-- Check for duplicates
SELECT vercel_deployment_id, COUNT(*) as count
FROM deployments
WHERE vercel_deployment_id IS NOT NULL
GROUP BY vercel_deployment_id
HAVING COUNT(*) > 1
ORDER BY count DESC;
