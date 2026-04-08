'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Search, Globe, Smartphone, Apple, ExternalLink, Download, RefreshCw, FileText, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function DeploymentsPage() {
  const { session } = useAuth()
  const [deployments, setDeployments] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    if (session) {
      fetchDeployments()
      const interval = setInterval(() => {
        fetchDeployments(true)
      }, 10000)
      return () => clearInterval(interval)
    }
  }, [session, typeFilter, statusFilter])

  async function fetchDeployments(silent = false) {
    if (!silent) setLoading(true)
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
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Deployments</h1>
          <p className="text-muted-foreground">Track all your web and mobile deployments</p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex gap-2">
            <Button
              variant={typeFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTypeFilter('all')}
            >
              All
            </Button>
            <Button
              variant={typeFilter === 'web' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTypeFilter('web')}
            >
              <Globe className="w-4 h-4 mr-1" />
              Web
            </Button>
            <Button
              variant={typeFilter === 'android' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTypeFilter('android')}
            >
              <Smartphone className="w-4 h-4 mr-1" />
              Android
            </Button>
            <Button
              variant={typeFilter === 'ios' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTypeFilter('ios')}
            >
              <Apple className="w-4 h-4 mr-1" />
              iOS
            </Button>
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
          <Card className="text-center py-12">
            <CardContent>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <Globe className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No deployments yet</h3>
              <p className="text-muted-foreground mb-4">
                Deploy your first project to see it here
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredDeployments.map((deployment) => (
              <Card key={deployment.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {getTypeIcon(deployment.type)}
                      <div>
                        <CardTitle className="text-lg">
                          {deployment.projects?.name || 'Unknown Project'}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          {getStatusIcon(deployment.status)}
                          <span className="capitalize">{deployment.type}</span>
                          {deployment.build_type && (
                            <>
                              <span>•</span>
                              <span className="capitalize">{deployment.build_type}</span>
                            </>
                          )}
                          <span>•</span>
                          <span>{formatTime(deployment.created_at)}</span>
                        </CardDescription>
                      </div>
                    </div>
                    {getStatusBadge(deployment.status)}
                  </div>
                </CardHeader>
                
                <CardContent>
                  {deployment.deployment_url && (
                    <div className="flex items-center gap-2 text-sm">
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                      <a
                        href={deployment.deployment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {deployment.deployment_url}
                      </a>
                    </div>
                  )}
                  
                  {deployment.error_message && (
                    <div className="mt-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                      {deployment.error_message}
                    </div>
                  )}
                </CardContent>

                <CardFooter className="flex gap-2">
                  {deployment.type === 'web' && deployment.deployment_url && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={deployment.deployment_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 mr-1" />
                        View Site
                      </a>
                    </Button>
                  )}
                  
                  {deployment.artifact_url && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={deployment.artifact_url} target="_blank" rel="noopener noreferrer">
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </a>
                    </Button>
                  )}
                  
                  {deployment.build_logs && (
                    <Button variant="outline" size="sm">
                      <FileText className="w-4 h-4 mr-1" />
                      Logs
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
