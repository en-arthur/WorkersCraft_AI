'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth'
import Logo from '@/components/logo'
import { FolderOpen, LogOut, CreditCard, Menu, X, Plug } from 'lucide-react'
import { Avatar, AvatarImage } from '@/components/ui/avatar'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import Link from 'next/link'

export default function DashboardLayout({ children }) {
  const router = useRouter()
  const { session } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  async function logout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div className="h-screen bg-background flex overflow-hidden" style={{ height: '100dvh' }}>
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-36' : 'w-12'} transition-all duration-300 border-r bg-muted/10 flex flex-col flex-shrink-0 h-full`}>
        <div className="p-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Logo width={20} height={20} />
              {sidebarOpen && <h2 className="font-semibold text-sm whitespace-nowrap">WorkersCraft</h2>}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="h-6 w-6 shrink-0"
            >
              {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>
          
          <nav className="space-y-1">
            <Link href="/dashboard">
              <Button variant="secondary" className="w-full justify-start h-8 px-1.5">
                <FolderOpen className={`h-4 w-4 ${sidebarOpen ? 'mr-2' : ''}`} />
                {sidebarOpen && <span className="text-xs">Projects</span>}
              </Button>
            </Link>
            <Link href="/dashboard/integrations">
              <Button variant="ghost" className="w-full justify-start h-8 px-1.5">
                <Plug className={`h-4 w-4 ${sidebarOpen ? 'mr-2' : ''}`} />
                {sidebarOpen && <span className="text-xs">Integrations</span>}
              </Button>
            </Link>
            <Link href="/dashboard/billing">
              <Button variant="ghost" className="w-full justify-start h-8 px-1.5">
                <CreditCard className={`h-4 w-4 ${sidebarOpen ? 'mr-2' : ''}`} />
                {sidebarOpen && <span className="text-xs">Billing</span>}
              </Button>
            </Link>
          </nav>
        </div>
        
        <div className="p-2 mt-auto space-y-1 border-t">
          {sidebarOpen && (
            <>
              <div className="flex items-center gap-2 px-1.5 py-1">
                <Avatar className="w-6 h-6">
                  <AvatarImage
                    src={session?.user?.user_metadata?.avatar_url || 'https://avatar.vercel.sh/' + session?.user?.email}
                    alt={session?.user?.email}
                  />
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{session?.user?.email}</p>
                </div>
              </div>
            </>
          )}
          <Button variant="ghost" className="w-full justify-start text-destructive h-8 px-1.5" onClick={logout}>
            <LogOut className={`h-4 w-4 ${sidebarOpen ? 'mr-2' : ''}`} />
            {sidebarOpen && <span className="text-xs">Sign out</span>}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Page Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  )
}
