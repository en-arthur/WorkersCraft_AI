import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function debug() {
  // Check recent deployments
  const { data: deployments } = await supabase
    .from('deployments')
    .select('id, project_id, vercel_deployment_id, deployment_url, status')
    .order('created_at', { ascending: false })
    .limit(10)
  
  console.log('Recent deployments:', JSON.stringify(deployments, null, 2))
  
  // Check for duplicates
  const { data: all } = await supabase
    .from('deployments')
    .select('vercel_deployment_id')
    .not('vercel_deployment_id', 'is', null)
  
  const counts = {}
  all.forEach(d => {
    counts[d.vercel_deployment_id] = (counts[d.vercel_deployment_id] || 0) + 1
  })
  
  const duplicates = Object.entries(counts).filter(([_, count]) => count > 1)
  console.log('Duplicates:', duplicates)
}

debug()
