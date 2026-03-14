const SDK_TEMPLATE = `/**
 * WorkersCraft Backend SDK
 * Auto-generated - Do not edit manually
 */

const API_URL = '{{API_URL}}'
const APP_ID = '{{APP_ID}}'

class BackendError extends Error {
  constructor(code, message, details) {
    super(message)
    this.code = code
    this.details = details
    this.name = 'BackendError'
  }
}

class Backend {
  constructor() {
    this.token = null
    this.refreshToken = null
    this.tokenExpiry = null
    this.loading = false
    this.listeners = []
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token')
      this.refreshToken = localStorage.getItem('refresh_token')
      this.tokenExpiry = localStorage.getItem('token_expiry')
    }
  }
  _setLoading(loading) { this.loading = loading; this.listeners.forEach(fn => fn(loading)) }
  onLoadingChange(callback) { this.listeners.push(callback); return () => { this.listeners = this.listeners.filter(fn => fn !== callback) } }
  _saveTokens(accessToken, refreshToken, expiresIn) {
    this.token = accessToken; this.refreshToken = refreshToken; this.tokenExpiry = Date.now() + (expiresIn * 1000)
    if (typeof window !== 'undefined') { localStorage.setItem('auth_token', accessToken); localStorage.setItem('refresh_token', refreshToken); localStorage.setItem('token_expiry', this.tokenExpiry) }
  }
  _isTokenExpired() { if (!this.tokenExpiry) return true; return Date.now() >= (this.tokenExpiry - 300000) }
  async _refreshAccessToken() {
    if (!this.refreshToken) throw new BackendError('NO_REFRESH_TOKEN', 'Please login again')
    try {
      const res = await fetch(\`\${API_URL}/api/auth/refresh\`, { method: 'POST', headers: { 'X-App-ID': APP_ID, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: this.refreshToken }) })
      if (!res.ok) { if (res.status === 401 || res.status === 403) { this.logout(); throw new BackendError('SESSION_EXPIRED', 'Please login again') } throw new Error('Refresh failed') }
      const data = await res.json(); this._saveTokens(data.access_token, data.refresh_token, data.expires_in); return data.access_token
    } catch (err) { if (err instanceof BackendError) throw err; throw new BackendError('NETWORK_ERROR', 'Failed to refresh token', { originalError: err.message }) }
  }
  async _ensureValidToken() { if (this._isTokenExpired()) await this._refreshAccessToken() }
  _headers(includeAuth = true) {
    const headers = { 'X-App-ID': APP_ID, 'Content-Type': 'application/json' }
    if (includeAuth && this.token) headers['Authorization'] = \`Bearer \${this.token}\`
    return headers
  }
  async _request(url, options = {}, retries = 3) {
    this._setLoading(true)
    try {
      if (!url.includes('/auth/') && this.token) await this._ensureValidToken()
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          const res = await fetch(url, options)
          if (res.status === 401 && !url.includes('/auth/')) {
            await this._refreshAccessToken(); options.headers['Authorization'] = \`Bearer \${this.token}\`
            const retryRes = await fetch(url, options)
            if (!retryRes.ok) { const error = await retryRes.json(); throw new BackendError(error.error?.code || 'UNAUTHORIZED', error.error?.message || 'Unauthorized', error.error?.details) }
            return await retryRes.json()
          }
          if (!res.ok) { const error = await res.json(); throw new BackendError(error.error?.code || 'UNKNOWN_ERROR', error.error?.message || 'Request failed', error.error?.details) }
          return await res.json()
        } catch (err) {
          if (err instanceof BackendError) throw err
          if (attempt === retries) throw new BackendError('NETWORK_ERROR', 'Failed to connect to server', { originalError: err.message })
          await new Promise(r => setTimeout(r, Math.min(Math.pow(2, attempt) * 1000, 4000)))
        }
      }
    } finally { this._setLoading(false) }
  }
  async register(email, password) { const data = await this._request(\`\${API_URL}/api/auth/register\`, { method: 'POST', headers: this._headers(false), body: JSON.stringify({ email, password }) }); this._saveTokens(data.access_token, data.refresh_token, data.expires_in); return { user_id: data.user_id, email: data.email } }
  async login(email, password) { const data = await this._request(\`\${API_URL}/api/auth/login\`, { method: 'POST', headers: this._headers(false), body: JSON.stringify({ email, password }) }); this._saveTokens(data.access_token, data.refresh_token, data.expires_in); return { user_id: data.user_id, email: data.email } }
  logout() { this.token = null; this.refreshToken = null; this.tokenExpiry = null; if (typeof window !== 'undefined') { localStorage.removeItem('auth_token'); localStorage.removeItem('refresh_token'); localStorage.removeItem('token_expiry') } }
  async getUser() { return await this._request(\`\${API_URL}/api/auth/me\`, { headers: this._headers() }) }
  async changePassword(oldPassword, newPassword) { return await this._request(\`\${API_URL}/api/auth/password\`, { method: 'PUT', headers: this._headers(), body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }) }) }
  async create(collection, data) { return await this._request(\`\${API_URL}/api/storage/\${collection}\`, { method: 'POST', headers: this._headers(), body: JSON.stringify({ data }) }) }
  async list(collection) { return await this._request(\`\${API_URL}/api/storage/\${collection}\`, { headers: this._headers() }) }
  async get(collection, id) { return await this._request(\`\${API_URL}/api/storage/\${collection}/\${id}\`, { headers: this._headers() }) }
  async update(collection, id, data) { return await this._request(\`\${API_URL}/api/storage/\${collection}/\${id}\`, { method: 'PUT', headers: this._headers(), body: JSON.stringify({ data }) }) }
  async delete(collection, id) { return await this._request(\`\${API_URL}/api/storage/\${collection}/\${id}\`, { method: 'DELETE', headers: this._headers() }) }
  async batchCreate(collection, items) { return await this._request(\`\${API_URL}/api/storage/\${collection}/batch\`, { method: 'POST', headers: this._headers(), body: JSON.stringify({ items }) }) }
  async batchDelete(collection, ids) { return await this._request(\`\${API_URL}/api/storage/\${collection}/batch\`, { method: 'DELETE', headers: this._headers(), body: JSON.stringify({ ids }) }) }
  async uploadFile(file) {
    await this._ensureValidToken(); const formData = new FormData(); formData.append('file', file); this._setLoading(true)
    try {
      const res = await fetch(\`\${API_URL}/api/files/upload\`, { method: 'POST', headers: { 'X-App-ID': APP_ID, 'Authorization': \`Bearer \${this.token}\` }, body: formData })
      if (!res.ok) { const error = await res.json(); throw new BackendError(error.error?.code || 'UPLOAD_FAILED', error.error?.message || 'File upload failed', error.error?.details) }
      return await res.json()
    } finally { this._setLoading(false) }
  }
  async listFiles() { return await this._request(\`\${API_URL}/api/files\`, { headers: this._headers() }) }
  async deleteFile(id) { return await this._request(\`\${API_URL}/api/files/\${id}\`, { method: 'DELETE', headers: this._headers() }) }
  getFileUrl(id) { return \`\${API_URL}/api/files/\${id}/download\` }
  isAuthenticated() { return !!(this.token && this.refreshToken) }
}

export const backend = new Backend()
`

export function generateBackendSDK(
  appId: string,
  apiUrl: string = process.env.NEXT_PUBLIC_CLOUDSERVICE_URL || 'https://cloud.workerscraft.com'
): string {
  return SDK_TEMPLATE
    .replace(/\{\{API_URL\}\}/g, apiUrl)
    .replace(/\{\{APP_ID\}\}/g, appId)
}

export function generatePlaceholderSDK(status: 'pending' | 'error', message: string): string {
  return `/**
 * WorkersCraft Backend SDK - ${status.toUpperCase()}
 * ${message}
 */

export const backend = {
  status: '${status}',
  message: '${message}',
  register: () => { throw new Error('${message}') },
  login: () => { throw new Error('${message}') },
  logout: () => {},
  getUser: () => { throw new Error('${message}') },
  create: () => { throw new Error('${message}') },
  list: () => { throw new Error('${message}') },
  get: () => { throw new Error('${message}') },
  update: () => { throw new Error('${message}') },
  delete: () => { throw new Error('${message}') },
  uploadFile: () => { throw new Error('${message}') },
  listFiles: () => { throw new Error('${message}') },
  deleteFile: () => { throw new Error('${message}') },
  isAuthenticated: () => false
}
`
}
