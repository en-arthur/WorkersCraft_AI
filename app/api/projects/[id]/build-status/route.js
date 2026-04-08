import { createClient } from '@supabase/supabase-js'
import { getGitHubToken, parseGitHubUrl } from '@/lib/github'

export async function GET(request, { params }) {
  try {
    const { id } = params
    const { searchParams } = new URL(request.url)
    const buildId = searchParams.get('build_id')
    
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    // If no buildId, return latest build for this project
    if (!buildId) {
      const { data: latestBuild } = await supabase.from('project_builds')
        .select('*')
        .eq('project_id', id)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      
      if (!latestBuild) return Response.json({ build: null })
      
      return Response.json({
        build: {
          id: latestBuild.id,
          platform: latestBuild.platform,
          buildType: latestBuild.build_type,
          status: latestBuild.status,
          artifactId: latestBuild.artifact_id,
          error: latestBuild.error,
          runId: latestBuild.run_id,
        }
      })
    }

    const { data: build } = await supabase.from('project_builds')
      .select('*').eq('id', buildId).eq('user_id', user.id).single()
    if (!build) return Response.json({ error: 'Build not found' }, { status: 404 })

    // Already terminal — return as-is
    if (['completed', 'failed'].includes(build.status)) {
      const runUrl = build.run_id ? `https://github.com/${build.project_id}/actions/runs/${build.run_id}` : null
      // Get repo URL for proper run link
      const { data: proj } = await supabase.from('projects').select('github_repo_url').eq('id', id).single()
      const repoMatch = proj?.github_repo_url?.match(/github\.com[/:]([^/]+\/[^/.]+)/)
      const repoPath = repoMatch?.[1] || ''
      return Response.json({
        status: build.status,
        artifactId: build.artifact_id,
        error: build.error,
        runUrl: build.run_id ? `https://github.com/${repoPath}/actions/runs/${build.run_id}` : null,
      })
    }

    const { data: project } = await supabase.from('projects').select('github_repo_url').eq('id', id).single()
    const githubToken = request.headers.get('x-github-token')
    const { owner, repo } = parseGitHubUrl(project.github_repo_url)

    const runRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/actions/runs/${build.run_id}`,
      { headers: { Authorization: `Bearer ${githubToken}`, Accept: 'application/vnd.github.v3+json' } }
    )
    const run = await runRes.json()

    let newStatus = build.status
    let artifactId = build.artifact_id
    let errorMsg = build.error

    if (run.status === 'in_progress' || run.status === 'queued') {
      newStatus = run.status
    } else if (run.status === 'completed') {
      if (run.conclusion === 'success') {
        newStatus = 'completed'
        // Fetch artifact id
        const artRes = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/actions/runs/${build.run_id}/artifacts`,
          { headers: { Authorization: `Bearer ${githubToken}`, Accept: 'application/vnd.github.v3+json' } }
        )
        const artData = await artRes.json()
        artifactId = artData.artifacts?.[0]?.id || null
      } else {
        newStatus = 'failed'
        // Fetch failed step message from jobs
        try {
          const jobsRes = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/actions/runs/${build.run_id}/jobs`,
            { headers: { Authorization: `Bearer ${githubToken}`, Accept: 'application/vnd.github.v3+json' } }
          )
          const jobsData = await jobsRes.json()
          const failedStep = jobsData.jobs?.flatMap(j => j.steps || []).find(s => s.conclusion === 'failure')
          errorMsg = failedStep ? `Step "${failedStep.name}" failed` : (run.conclusion || 'Build failed')
        } catch {
          errorMsg = run.conclusion || 'Build failed'
        }
      }
    }

    await supabase.from('project_builds').update({
      status: newStatus, artifact_id: artifactId, error: errorMsg, updated_at: new Date().toISOString(),
    }).eq('id', buildId)

    // Sync deployments table
    const deploymentStatus = newStatus === 'completed' ? 'success' : newStatus === 'failed' ? 'failed' : 'building'
    const repoMatch = project.github_repo_url?.match(/github\.com[/:]([^/]+\/[^/.]+)/)
    const repoPath = repoMatch?.[1] || ''
    
    await supabase.from('deployments').update({
      status: deploymentStatus,
      artifact_url: artifactId ? `https://github.com/${repoPath}/actions/runs/${build.run_id}` : null,
      error_message: errorMsg,
      completed_at: ['completed', 'failed'].includes(newStatus) ? new Date().toISOString() : null
    }).eq('github_run_id', build.run_id.toString())

    return Response.json({
      status: newStatus,
      artifactId,
      error: errorMsg,
      runUrl: build.run_id ? `https://github.com/${repoPath}/actions/runs/${build.run_id}` : null,
    })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
