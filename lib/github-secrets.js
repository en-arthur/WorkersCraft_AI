// Encrypts and injects secrets into a GitHub repo for Actions
// Implements crypto_box_seal using tweetnacl (GitHub requires libsodium sealed box)

import nacl from 'tweetnacl'

// crypto_box_seal = ephemeral keypair + nacl.box + prepend ephemeral public key
function sealedBox(message, recipientPublicKey) {
  const ephemeralKeypair = nacl.box.keyPair()
  const nonce = new Uint8Array(nacl.box.nonceLength)
  // nonce = first 24 bytes of HSalsa20(ephemeral_pk || recipient_pk)
  const nonceInput = new Uint8Array(ephemeralKeypair.publicKey.length + recipientPublicKey.length)
  nonceInput.set(ephemeralKeypair.publicKey)
  nonceInput.set(recipientPublicKey, ephemeralKeypair.publicKey.length)
  const hash = nacl.hash(nonceInput)
  nonce.set(hash.slice(0, nacl.box.nonceLength))

  const encrypted = nacl.box(message, nonce, recipientPublicKey, ephemeralKeypair.secretKey)
  const result = new Uint8Array(ephemeralKeypair.publicKey.length + encrypted.length)
  result.set(ephemeralKeypair.publicKey)
  result.set(encrypted, ephemeralKeypair.publicKey.length)
  return result
}

export async function injectGitHubSecret(githubToken, owner, repo, secretName, secretValue) {
  const keyRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/public-key`, {
    headers: { Authorization: `Bearer ${githubToken}`, Accept: 'application/vnd.github.v3+json' },
  })
  if (!keyRes.ok) throw new Error(`Failed to get repo public key: ${keyRes.status}`)
  const { key, key_id } = await keyRes.json()

  const keyBytes = Buffer.from(key, 'base64')
  const secretBytes = Buffer.from(secretValue)
  const encryptedBytes = sealedBox(secretBytes, keyBytes)
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
