import nacl from 'tweetnacl'

export async function injectGitHubSecret(githubToken, owner, repo, secretName, secretValue) {
  const keyRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/public-key`, {
    headers: { Authorization: `Bearer ${githubToken}`, Accept: 'application/vnd.github.v3+json' },
  })
  if (!keyRes.ok) throw new Error(`Failed to get repo public key: ${keyRes.status}`)
  const { key, key_id } = await keyRes.json()

  const keyBytes = Buffer.from(key, 'base64')
  const secretBytes = Buffer.from(secretValue)
  const encryptedBytes = nacl.box.seal(secretBytes, keyBytes)
  const encryptedValue = Buffer.from(encryptedBytes).toString('base64')

  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/secrets/${secretName}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${githubToken}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ encrypted_value: encryptedValue, key_id }),
  })

  if (!res.ok && res.status !== 204) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Failed to set secret ${secretName}: ${err.message || res.status}`)
  }
}
