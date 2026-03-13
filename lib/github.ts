// GitHub API utility functions

/**
 * Get GitHub access token from Supabase session
 */
export function getGitHubToken(session) {
  if (!session?.provider_token) {
    throw new Error('No GitHub token found. Please sign in with GitHub.')
  }
  return session.provider_token
}

/**
 * Get GitHub user info from session
 */
export function getGitHubUser(session) {
  return {
    username: session.user.user_metadata.user_name,
    name: session.user.user_metadata.full_name || session.user.user_metadata.name,
    email: session.user.email,
    avatarUrl: session.user.user_metadata.avatar_url,
  }
}

/**
 * Fetch user's GitHub repositories
 */
export async function fetchGitHubRepos(token, options = {}) {
  const { page = 1, perPage = 100, sort = 'updated' } = options
  
  const response = await fetch(
    `https://api.github.com/user/repos?per_page=${perPage}&page=${page}&sort=${sort}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to fetch repositories')
  }

  return response.json()
}

/**
 * Fetch branches for a repository
 */
export async function fetchRepoBranches(token, owner, repo) {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/branches`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to fetch branches')
  }

  return response.json()
}

/**
 * Get repository details
 */
export async function fetchRepoDetails(token, owner, repo) {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to fetch repository details')
  }

  return response.json()
}

/**
 * Parse GitHub repo URL to extract owner and repo name
 */
export function parseGitHubUrl(url) {
  // Support both HTTPS and SSH URLs
  const httpsMatch = url.match(/github\.com[\/:]([^\/]+)\/([^\/\.]+)(\.git)?/)
  
  if (httpsMatch) {
    return {
      owner: httpsMatch[1],
      repo: httpsMatch[2],
    }
  }
  
  throw new Error('Invalid GitHub repository URL')
}
