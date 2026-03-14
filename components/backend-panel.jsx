'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { supabase } from '@/lib/supabase'
import { Loader2, Trash2, RefreshCw, Users, Database, FileIcon } from 'lucide-react'

export function BackendPanel({ appId, projectId }) {
  const [tab, setTab] = useState('users')
  const [users, setUsers] = useState([])
  const [records, setRecords] = useState([])
  const [files, setFiles] = useState([])
  const [collections, setCollections] = useState([])
  const [selectedCollection, setSelectedCollection] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async (resource, collection = '') => {
    setLoading(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const url = `/api/backend/${appId}?resource=${resource}${collection ? `&collection=${collection}` : ''}`
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to fetch')
      return data
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [appId])

  useEffect(() => {
    if (tab === 'users') {
      fetchData('users').then(data => data && setUsers(data.users || []))
    } else if (tab === 'storage') {
      fetchData('storage').then(data => {
        if (!data) return
        const recs = data.records || []
        setRecords(recs)
        const cols = [...new Set(recs.map(r => r.collection))]
        setCollections(cols)
        if (cols.length > 0 && !selectedCollection) setSelectedCollection(cols[0])
      })
    } else if (tab === 'files') {
      fetchData('files').then(data => data && setFiles(data.files || []))
    }
  }, [tab, fetchData])

  const handleDeleteUser = async (userId) => {
    const { data: { session } } = await supabase.auth.getSession()
    await fetch(`/api/backend/${appId}?resource=users&record_id=${userId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` }
    })
    setUsers(users.filter(u => u.user_id !== userId))
  }

  const handleDeleteFile = async (fileId) => {
    const { data: { session } } = await supabase.auth.getSession()
    await fetch(`/api/backend/${appId}?resource=files&record_id=${fileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` }
    })
    setFiles(files.filter(f => f.id !== fileId))
  }

  const handleDeleteRecord = async (recordId) => {
    const { data: { session } } = await supabase.auth.getSession()
    await fetch(`/api/backend/${appId}?resource=storage&record_id=${recordId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` }
    })
    setRecords(records.filter(r => r.id !== recordId))
  }

  const filteredRecords = selectedCollection
    ? records.filter(r => r.collection === selectedCollection)
    : records

  return (
    <div className="p-4 h-full overflow-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-sm">Backend Data</h2>
        <Button variant="ghost" size="icon" onClick={() => {
          if (tab === 'users') fetchData('users').then(d => d && setUsers(d.users || []))
          else if (tab === 'files') fetchData('files').then(d => d && setFiles(d.files || []))
          else fetchData('storage').then(d => d && setRecords(d.records || []))
        }}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {error && <div className="text-red-500 text-sm mb-3">{error}</div>}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="users" className="gap-1 text-xs">
            <Users className="w-3 h-3" /> Users
          </TabsTrigger>
          <TabsTrigger value="storage" className="gap-1 text-xs">
            <Database className="w-3 h-3" /> Storage
          </TabsTrigger>
          <TabsTrigger value="files" className="gap-1 text-xs">
            <FileIcon className="w-3 h-3" /> Files
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : users.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No users yet</p>
          ) : (
            <div className="space-y-2">
              {users.map(u => (
                <div key={u.user_id} className="flex items-center justify-between p-2 border rounded text-sm">
                  <div>
                    <div className="font-medium">{u.email}</div>
                    <div className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(u.user_id)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="storage">
          {collections.length > 0 && (
            <div className="flex gap-2 mb-3 flex-wrap">
              {collections.map(c => (
                <Button
                  key={c}
                  size="sm"
                  variant={selectedCollection === c ? 'default' : 'outline'}
                  className="text-xs h-7"
                  onClick={() => setSelectedCollection(c)}
                >
                  {c}
                </Button>
              ))}
            </div>
          )}
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : filteredRecords.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No records yet</p>
          ) : (
            <div className="space-y-2">
              {filteredRecords.map(r => (
                <div key={r.id} className="flex items-start justify-between p-2 border rounded text-sm">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-muted-foreground mb-1">{r.collection} · {new Date(r.created_at).toLocaleDateString()}</div>
                    <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-24">{JSON.stringify(r.data, null, 2)}</pre>
                  </div>
                  <Button variant="ghost" size="icon" className="ml-2 shrink-0" onClick={() => handleDeleteRecord(r.id)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="files">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : files.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No files yet</p>
          ) : (
            <div className="space-y-2">
              {files.map(f => (
                <div key={f.id} className="flex items-center justify-between p-2 border rounded text-sm">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{f.filename}</div>
                    <div className="text-xs text-muted-foreground">
                      {f.mime_type} · {f.size_bytes ? `${(f.size_bytes / 1024).toFixed(1)} KB` : 'unknown size'} · {new Date(f.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2 shrink-0">
                    {f.url && (
                      <Button variant="ghost" size="icon" onClick={() => window.open(f.url, '_blank')}>
                        <FileIcon className="w-4 h-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteFile(f.id)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
