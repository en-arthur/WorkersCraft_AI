'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Search, Globe, Smartphone, Apple, ExternalLink, Download, RefreshCw, FileText, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { CustomDomainDialog } from '@/components/custom-domain-dialog'

export default function DeploymentsPage() {
  const [session, setSession] = useState(null)
  const [deployments, setDeployments] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
    })
  }, [])

  useEffect(() => {
    if (session) fetchDeployments()
  }, [session, typeFilter, statusFilter])

  async function fetchDeployments() {
    setLoading(true)
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession()
      
      let url = `/api/deployments?`
      if (typeFilter !== 'all') url += `type=${typeFilter}&`
      if (statusFilter !== 'all') url += `status=${statusFilter}&`

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${currentSession?.access_token}` }
      })
      const data = await response.json()
      setDeployments(data.deployments || [])
    } catch (error) {
      console.error('Error fetching deployments:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredDeployments = deployments.filter(d => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return d.projects?.name.toLowerCase().includes(query)
  })

  function getStatusIcon(status) {
    switch (status) {
      case 'success': return <CheckCircle2 className="w-4 h-4 text-green-500" />
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />
      case 'building': return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
      default: return <Clock className="w-4 h-4 text-gray-500" />
    }
  }

  function getStatusBadge(status) {
    const variants = {
      success: 'default',
      failed: 'destructive',
      building: 'secondary',
      pending: 'outline'
    }
    return <Badge variant={variants[status]}>{status}</Badge>
  }

  function getTypeIcon(type) {
    switch (type) {
      case 'web': return <Globe className="w-5 h-5 text-blue-500" />
      case 'android': return <Smartphone className="w-5 h-5 text-green-500" />
      case 'ios': return <Apple className="w-5 h-5 text-gray-700" />
      default: return null
    }
  }

  function formatTime(timestamp) {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = Math.floor((now - date) / 1000)
    
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="px-6 md:px-10 py-10">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold mb-1">Deployments</h1>
          <p className="text-sm text-muted-foreground">Track all your web and mobile deployments</p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-3">
          <div className="flex gap-2">
            {[
              { key: 'all', label: 'All' },
              { key: 'web', label: 'Web', icon: Globe },
              { key: 'android', label: 'Android', icon: Smartphone },
            ].map(({ key, label, icon: Icon }) => (
              <Button
                key={key}
                variant={typeFilter === key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTypeFilter(key)}
                className="gap-1.5"
              >
                {Icon && <Icon className="w-3.5 h-3.5" />}
                {label}
              </Button>
            ))}
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search deployments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Deployments List */}
        {filteredDeployments.length === 0 ? (
          <div className="text-center py-24 border-2 border-dashed rounded-xl">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <Globe className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold mb-1">No deployments yet</h3>
            <p className="text-sm text-muted-foreground">Deploy your first project to see it here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDeployments.map((deployment) => (
              <Card key={deployment.id} className="hover:shadow-md hover:border-primary/30 transition-all duration-150">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="shrink-0 w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                        {getTypeIcon(deployment.type)}
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-base truncate">
                          {deployment.projects?.name || 'Unknown Project'}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-1.5 mt-0.5 text-xs">
                          {getStatusIcon(deployment.status)}
                          <span className="capitalize">{deployment.type}</span>
                          {deployment.build_type && <><span>·</span><span className="capitalize">{deployment.build_type}</span></>}
                          <span>·</span>
                          <span>{formatTime(deployment.created_at)}</span>
                        </CardDescription>
                      </div>
                    </div>
                    {getStatusBadge(deployment.status)}
                  </div>
                </CardHeader>

                {(deployment.deployment_url || deployment.error_message) && (
                  <CardContent className="pt-0 pb-3">
                    {deployment.deployment_url && (
                      <div className="flex items-center gap-2 text-sm">
                        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <a href={deployment.deployment_url} target="_blank" rel="noopener noreferrer"
                          className="text-primary hover:underline truncate">
                          {deployment.deployment_url}
                        </a>
                      </div>
                    )}
                    {deployment.error_message && (
                      <div className="mt-2 p-3 rounded-lg bg-destructive/10 text-destructive text-xs">
                        {deployment.error_message}
                      </div>
                    )}
                  </CardContent>
                )}

                {(deployment.deployment_url || deployment.artifact_url || deployment.build_logs) && (
                  <CardFooter className="pt-0 gap-2">
                    {deployment.type === 'web' && deployment.deployment_url && (
                      <>
                        <Button variant="outline" size="sm" asChild>
                          <a href={deployment.deployment_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-3.5 h-3.5 mr-1.5" />View Site
                          </a>
                        </Button>
                        <CustomDomainDialog 
                          projectId={deployment.project_id}
                          currentDomain={deployment.projects?.custom_domain}
                          onDomainAdded={() => fetchDeployments()}
                        />
                      </>
                    )}
                    {deployment.artifact_url && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={deployment.artifact_url} target="_blank" rel="noopener noreferrer">
                          <Download className="w-3.5 h-3.5 mr-1.5" />Download
                        </a>
                      </Button>
                    )}
                    {deployment.build_logs && (
                      <Button variant="outline" size="sm">
                        <FileText className="w-3.5 h-3.5 mr-1.5" />Logs
                      </Button>
                    )}
                  </CardFooter>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
