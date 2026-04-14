import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { addDomainToVercelProject, getDomainConfig, removeDomainFromVercelProject, getDNSInstructions } from '@/lib/vercel-domain'

export async function POST(request, { params }) {
  try {
    const { projectId } = params
    const { domain } = await request.json()
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user session
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get project and verify ownership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Get latest deployment to find Vercel project ID
    const { data: deployment } = await supabase
      .from('deployments')
      .select('vercel_deployment_id, deployment_url')
      .eq('project_id', projectId)
      .eq('status', 'success')
      .eq('type', 'web')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!deployment || !deployment.vercel_deployment_id) {
      return NextResponse.json({ 
        error: 'No Vercel deployment found. Deploy your project first.' 
      }, { status: 400 })
    }

    // Extract Vercel project ID from deployment URL
    // Format: https://project-name-hash.vercel.app
    const vercelProjectId = deployment.deployment_url?.split('.')[0]?.split('//')[1]?.split('-').slice(0, -1).join('-')
    
    if (!vercelProjectId) {
      return NextResponse.json({ error: 'Could not determine Vercel project ID' }, { status: 400 })
    }

    // Add domain to Vercel project
    await addDomainToVercelProject(vercelProjectId, domain)

    // Get DNS configuration
    const domainConfig = await getDomainConfig(domain)
    const dnsInfo = getDNSInstructions(domainConfig)

    // Update project with custom domain
    await supabase
      .from('projects')
      .update({
        custom_domain: domain,
        domain_verified: dnsInfo.verified,
        domain_added_at: new Date().toISOString(),
      })
      .eq('id', projectId)

    return NextResponse.json({
      success: true,
      domain,
      verified: dnsInfo.verified,
      dnsRecords: dnsInfo.instructions,
    })
  } catch (error) {
    console.error('Error adding domain:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to add domain' 
    }, { status: 500 })
  }
}

export async function GET(request, { params }) {
  try {
    const { projectId } = params
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('custom_domain, domain_verified')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single()

    if (projectError || !project || !project.custom_domain) {
      return NextResponse.json({ error: 'No custom domain configured' }, { status: 404 })
    }

    // Check domain configuration status
    const domainConfig = await getDomainConfig(project.custom_domain)
    const dnsInfo = getDNSInstructions(domainConfig)

    // Update verification status if changed
    if (dnsInfo.verified !== project.domain_verified) {
      await supabase
        .from('projects')
        .update({ domain_verified: dnsInfo.verified })
        .eq('id', projectId)
    }

    return NextResponse.json({
      domain: project.custom_domain,
      verified: dnsInfo.verified,
      dnsRecords: dnsInfo.instructions,
      configuredBy: dnsInfo.configuredBy,
    })
  } catch (error) {
    console.error('Error checking domain:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to check domain' 
    }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const { projectId } = params
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('custom_domain')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single()

    if (projectError || !project || !project.custom_domain) {
      return NextResponse.json({ error: 'No custom domain configured' }, { status: 404 })
    }

    // Get Vercel project ID
    const { data: deployment } = await supabase
      .from('deployments')
      .select('deployment_url')
      .eq('project_id', projectId)
      .eq('status', 'success')
      .eq('type', 'web')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (deployment?.deployment_url) {
      const vercelProjectId = deployment.deployment_url.split('.')[0]?.split('//')[1]?.split('-').slice(0, -1).join('-')
      if (vercelProjectId) {
        await removeDomainFromVercelProject(vercelProjectId, project.custom_domain)
      }
    }

    // Remove from database
    await supabase
      .from('projects')
      .update({
        custom_domain: null,
        domain_verified: false,
        domain_added_at: null,
      })
      .eq('id', projectId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing domain:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to remove domain' 
    }, { status: 500 })
  }
}
