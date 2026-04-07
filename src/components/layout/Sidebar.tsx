import { useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutGrid, Users, Archive, Settings, X, ChevronsUpDown, Check, Building2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/auth/AuthProvider'
import type { Database } from '@/types/database'

type Project = Pick<Database['public']['Tables']['projects']['Row'], 'id' | 'name'>
type Workspace = Pick<Database['public']['Tables']['workspaces']['Row'], 'id' | 'name'>

export function Sidebar({ open, onClose }: { open?: boolean; onClose?: () => void }) {
  const state = useAuth()
  const [allWorkspaces, setAllWorkspaces] = useState<Workspace[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [switching, setSwitching] = useState(false)
  const switcherRef = useRef<HTMLDivElement>(null)

  const profile = state.status === 'authenticated' ? state.data.profile : null
  const isOwner = profile?.role === 'owner'
  const isFreelancer = profile?.role === 'freelancer'

  // Derive current workspace from the list — no separate fetch needed
  const currentWorkspace = allWorkspaces.find(ws => ws.id === profile?.workspace_id) ?? null

  function fetchProjects() {
    supabase
      .from('projects')
      .select('id, name')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setProjects(data) })
  }

  useEffect(() => {
    if (state.status !== 'authenticated') return

    // Fetch all workspaces user belongs to (via user_workspaces join)
    supabase
      .from('user_workspaces')
      .select('workspace_id, workspaces(id, name)')
      .then(({ data }) => {
        if (!data) return
        const ws = data
          .map(row => row.workspaces as Workspace | null)
          .filter((w): w is Workspace => w !== null)
        setAllWorkspaces(ws)
      })

    fetchProjects()
    window.addEventListener('projects-changed', fetchProjects)
    return () => window.removeEventListener('projects-changed', fetchProjects)
  }, [state.status])

  // Close switcher on outside click
  useEffect(() => {
    if (!switcherOpen) return
    function handleClick(e: MouseEvent) {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setSwitcherOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [switcherOpen])

  async function handleSwitchWorkspace(ws: Workspace) {
    if (ws.id === currentWorkspace?.id || switching) return
    setSwitching(true)
    setSwitcherOpen(false)
    try {
      await supabase.rpc('switch_workspace', { p_workspace_id: ws.id })
      // Hard reload — all workspace-scoped state gets cleared cleanly
      window.location.href = '/dashboard'
    } catch {
      setSwitching(false)
    }
  }

  return (
    <aside
      className={`
        w-60 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col h-screen overflow-y-auto
        fixed inset-y-0 left-0 z-50 transition-transform duration-200
        md:relative md:translate-x-0
        ${open ? 'translate-x-0' : '-translate-x-full'}
      `}
    >
      {/* Workspace header / switcher */}
      <div className="px-3 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between gap-1">
          <div
            ref={switcherRef}
            className="relative flex-1 min-w-0"
          >
            <button
              onClick={() => setSwitcherOpen(v => !v)}
              disabled={switching}
              className={`
                w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors
                hover:bg-gray-100 cursor-pointer
                ${switching ? 'opacity-50' : ''}
              `}
            >
              <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 text-sm truncate leading-tight">
                  {switching ? 'Switching…' : (currentWorkspace?.name ?? '…')}
                </div>
                <div className="text-xs text-gray-400 leading-tight">Project Tracker</div>
              </div>
              <ChevronsUpDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            </button>

            {/* Dropdown */}
            {switcherOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1 overflow-hidden">
                <p className="px-3 py-1.5 text-[11px] font-medium text-gray-400 uppercase tracking-wide">
                  Workspaces
                </p>
                {allWorkspaces.map(ws => (
                  <button
                    key={ws.id}
                    onClick={() => handleSwitchWorkspace(ws)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-5 h-5 rounded bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-3 h-3 text-blue-600" />
                    </div>
                    <span className="flex-1 truncate text-gray-800">{ws.name}</span>
                    {ws.id === currentWorkspace?.id && (
                      <Check className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Close button — mobile only */}
          <button
            onClick={onClose}
            className="md:hidden p-1 rounded hover:bg-gray-100 text-gray-400 flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-2 flex-1 min-h-0 overflow-y-auto">
        <SidebarLink to="/dashboard" icon={<LayoutGrid className="w-4 h-4" />} onClick={onClose}>
          Projects
        </SidebarLink>
        {!isFreelancer && (
          <SidebarLink to="/clients" icon={<Users className="w-4 h-4" />} onClick={onClose}>
            Clients
          </SidebarLink>
        )}
        {!isFreelancer && (
          <SidebarLink to="/archive" icon={<Archive className="w-4 h-4" />} onClick={onClose}>
            Archive
          </SidebarLink>
        )}
        {isOwner && (
          <SidebarLink to="/workspace" icon={<Settings className="w-4 h-4" />} onClick={onClose}>
            Workspace
          </SidebarLink>
        )}

        {projects.length > 0 && (
          <>
            <div className="mt-4 mb-1 px-3 text-xs font-medium text-gray-400 uppercase tracking-wide">
              Projects
            </div>
            {projects.map(p => (
              <NavLink
                key={p.id}
                to={`/project/${p.id}`}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors truncate
                   ${isActive ? 'bg-gray-100 font-medium text-gray-900' : 'text-gray-600 hover:bg-gray-50'}`
                }
              >
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0 mt-0.5" />
                <span className="truncate">{p.name}</span>
              </NavLink>
            ))}
          </>
        )}
      </nav>
    </aside>
  )
}

function SidebarLink({
  to, icon, children, onClick,
}: {
  to: string
  icon: React.ReactNode
  children: React.ReactNode
  onClick?: () => void
}) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors
         ${isActive ? 'bg-gray-100 font-medium text-gray-900' : 'text-gray-600 hover:bg-gray-50'}`
      }
    >
      {icon}
      {children}
    </NavLink>
  )
}
