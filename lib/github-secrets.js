// Encrypts and injects secrets into a GitHub repo for Actions
// Uses libsodium-wrappers to encrypt with the repo's public key

import sodium from 'libsodium-wrappers'

export async function injectGitHubSecret(githubToken, owner, repo, secretName, secretValue) {
  await sodium.ready

  // Get repo public key
  const keyRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/public-key`, {
    headers: { Authorization: `Bearer ${githubToken}`, Accept: 'application/vnd.github.v3+json' },
  })
  if (!keyRes.ok) throw new Error(`Failed to get repo public key: ${keyRes.status}`)
  const { key, key_id } = await keyRes.json()

  // Encrypt secret
  const binKey = sodium.from_base64(key, sodium.base64_variants.ORIGINAL)
  const binSecret = sodium.from_string(secretValue)
  const encryptedBytes = sodium.crypto_box_seal(binSecret, binKey)
  const encryptedValue = sodium.to_base64(encryptedBytes, sodium.base64_variants.ORIGINAL)

  // Upload secret
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
