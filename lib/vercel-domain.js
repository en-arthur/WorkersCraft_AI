const VERCEL_API_URL = 'https://api.vercel.com'

export async function addDomainToVercelProject(projectId, domain, vercelToken) {
  const response = await fetch(`${VERCEL_API_URL}/v9/projects/${projectId}/domains`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${vercelToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: domain }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Failed to add domain')
  }

  return await response.json()
}

export async function getDomainConfig(domain, vercelToken) {
  const response = await fetch(`${VERCEL_API_URL}/v6/domains/${domain}/config`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${vercelToken}`,
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Failed to get domain config')
  }

  return await response.json()
}

export async function removeDomainFromVercelProject(projectId, domain, vercelToken) {
  const response = await fetch(`${VERCEL_API_URL}/v9/projects/${projectId}/domains/${domain}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${vercelToken}`,
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Failed to remove domain')
  }

  return { success: true }
}

export function getDNSInstructions(domainConfig) {
  const { configuredBy, misconfigured, recommendedCNAME, recommendedIPv4 } = domainConfig

  if (!misconfigured) {
    return { verified: true, instructions: [] }
  }

  const instructions = []

  if (recommendedCNAME && recommendedCNAME.length > 0) {
    const cname = recommendedCNAME.find(r => r.rank === 1) || recommendedCNAME[0]
    instructions.push({
      type: 'CNAME',
      name: '@',
      value: cname.value,
      priority: 1,
    })
  }

  if (recommendedIPv4 && recommendedIPv4.length > 0) {
    const ipv4 = recommendedIPv4.find(r => r.rank === 1) || recommendedIPv4[0]
    if (ipv4.value && ipv4.value.length > 0) {
      instructions.push({
        type: 'A',
        name: '@',
        value: ipv4.value[0],
        priority: 2,
      })
    }
  }

  return {
    verified: false,
    configuredBy: configuredBy || null,
    instructions,
  }
}
