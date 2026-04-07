import { useEffect, useState } from 'react'
import { Bell, ChevronDown, LogOut, Menu, Settings, CalendarClock } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/components/auth/AuthProvider'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'

type Notification = Database['public']['Tables']['notifications']['Row']
type DeadlinePage = {
  id: string
  name: string
  deadline: string
  phase: string
  project_id: string
  project_name: string
  days: number
}

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const crumb = useBreadcrumb()
  const state = useAuth()
  const navigate = useNavigate()
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [deadlineOpen, setDeadlineOpen] = useState(false)
  const [deadlinePages, setDeadlinePages] = useState<DeadlinePage[]>([])
  const baseProfile = state.status === 'authenticated' ? state.data.profile : null
  const userId = state.status === 'authenticated' ? state.data.user.id : null
  const [profileName, setProfileName] = useState<string | null>(null)
  const profile = baseProfile ? { ...baseProfile, name: profileName ?? baseProfile.name } : null

  useEffect(() => {
    if (state.status !== 'authenticated' || !userId) return

    // Initial unread count fetch
    supabase.from('notifications').select('id', { count: 'exact', head: true })
      .eq('user_id', userId).eq('read', false)
      .then(({ count }) => setUnreadCount(count ?? 0))

    // Realtime subscription — increment badge when a new notification arrives
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => setUnreadCount(n => n + 1),
      )
      .subscribe()

    function onProfileUpdated() {
      supabase.from('profiles').select('name').eq('id', userId!).single()
        .then(({ data }) => { if (data) setProfileName(data.name) })
    }
    window.addEventListener('profile-updated', onProfileUpdated)

    return () => {
      supabase.removeChannel(channel)
      window.removeEventListener('profile-updated', onProfileUpdated)
    }
  }, [state.status, userId])

  async function handleOpenChange(open: boolean) {
    setPopoverOpen(open)
    if (!open) return
    const { data } = await supabase.from('notifications').select('*')
      .eq('user_id', userId!).order('created_at', { ascending: false }).limit(20)
    setNotifications(data ?? [])
    if (unreadCount > 0) {
      await supabase.from('notifications').update({ read: true })
        .eq('user_id', userId!).eq('read', false)
      setUnreadCount(0)
    }
  }

  async function handleOpenDeadlines(open: boolean) {
    setDeadlineOpen(open)
    if (!open) return
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const in30 = new Date(today)
    in30.setDate(in30.getDate() + 30)
    const { data } = await supabase
      .from('pages')
      .select('id, name, deadline, phase, project_id, projects(name)')
      .not('deadline', 'is', null)
      .neq('phase', 'done')
      .lte('deadline', in30.toISOString().split('T')[0])
      .order('deadline', { ascending: true })
    const pages: DeadlinePage[] = (data ?? []).map((p: any) => {
      const d = new Date(p.deadline)
      d.setHours(0, 0, 0, 0)
      const days = Math.round((d.getTime() - today.getTime()) / 86400000)
      return {
        id: p.id,
        name: p.name,
        deadline: p.deadline,
        phase: p.phase,
        project_id: p.project_id,
        project_name: p.projects?.name ?? '',
        days,
      }
    })
    setDeadlinePages(pages)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  return (
    <header className="h-12 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 flex-shrink-0 gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <button onClick={onMenuClick} className="md:hidden p-1.5 rounded-md hover:bg-gray-100 text-gray-500 flex-shrink-0">
          <Menu className="w-5 h-5" />
        </button>
        <span className="text-sm text-gray-500 truncate">{crumb}</span>
      </div>
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        {/* Upcoming deadlines */}
        <Popover open={deadlineOpen} onOpenChange={handleOpenDeadlines}>
          <PopoverTrigger className="relative p-1.5 rounded-md hover:bg-gray-100 transition-colors">
            <CalendarClock className="w-5 h-5 text-gray-500" />
            {deadlinePages.filter(p => p.days < 0).length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-orange-500 text-white text-[10px] font-bold leading-none">
                {deadlinePages.filter(p => p.days < 0).length}
              </span>
            )}
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-medium text-gray-900">Upcoming deadlines</p>
              <p className="text-xs text-gray-400 mt-0.5">Pages due in the next 30 days</p>
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
              {deadlinePages.length === 0 ? (
                <p className="px-4 py-8 text-sm text-gray-400 text-center">No upcoming deadlines</p>
              ) : deadlinePages.map(p => {
                const overdue = p.days < 0
                const urgent = p.days >= 0 && p.days <= 3
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setDeadlineOpen(false)
                      navigate(`/project/${p.project_id}`, { state: { openPageId: p.id } })
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                        <p className="text-xs text-gray-400 truncate">{p.project_name}</p>
                      </div>
                      <span className={`text-xs font-medium flex-shrink-0 mt-0.5 ${overdue ? 'text-red-500' : urgent ? 'text-orange-500' : 'text-gray-400'}`}>
                        {overdue ? `${Math.abs(p.days)}d overdue` : p.days === 0 ? 'Today' : `${p.days}d`}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </PopoverContent>
        </Popover>

        <Popover open={popoverOpen} onOpenChange={handleOpenChange}>
          <PopoverTrigger className="relative p-1.5 rounded-md hover:bg-gray-100 transition-colors">
            <Bell className="w-5 h-5 text-gray-500" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-medium text-gray-900">Notifications</p>
            </div>
            <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
              {notifications.length === 0 ? (
                <p className="px-4 py-8 text-sm text-gray-400 text-center">No notifications yet</p>
              ) : notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => {
                    setPopoverOpen(false)
                    if (n.project_id) {
                      navigate(`/project/${n.project_id}`, {
                        state: { openPageId: n.page_id ?? undefined },
                      })
                    }
                  }}
                  className={`w-full text-left px-4 py-3 transition-colors hover:bg-gray-50 ${!n.read ? 'bg-blue-50/60' : ''} ${n.project_id ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  <p className="text-sm text-gray-800 leading-snug">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(n.created_at).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        {/* User menu */}
        <Popover open={userMenuOpen} onOpenChange={setUserMenuOpen}>
          <PopoverTrigger className="flex items-center gap-1.5 px-1.5 py-1 rounded-md hover:bg-gray-100 transition-colors">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 flex-shrink-0">
              {profile?.avatar ?? '?'}
            </span>
            <span className="hidden sm:block text-sm text-gray-700 max-w-[120px] truncate">{profile?.name ?? '…'}</span>
            <ChevronDown className="hidden sm:block w-3.5 h-3.5 text-gray-400" />
          </PopoverTrigger>
          <PopoverContent align="end" className="w-48 p-1">
            <div className="px-3 py-2 mb-1 border-b border-gray-100">
              <p className="text-sm font-medium text-gray-900 truncate">{profile?.name}</p>
              <p className="text-xs text-gray-400 capitalize mt-0.5">{profile?.role}</p>
            </div>
            <button
              onClick={() => { navigate('/account'); setUserMenuOpen(false) }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
            >
              <Settings className="w-4 h-4 text-gray-400" />
              Account settings
            </button>
            <Separator className="my-1" />
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 rounded-md hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  )
}

function useBreadcrumb(): string {
  const { pathname } = useLocation()
  if (pathname.startsWith('/project/') && pathname.endsWith('/gantt')) return 'Gantt'
  if (pathname.startsWith('/project/') && pathname.endsWith('/settings')) return 'Project Settings'
  if (pathname.startsWith('/project/')) return 'Pages'
  if (pathname === '/clients') return 'Clients'
  if (pathname === '/archive') return 'Archive'
  if (pathname === '/workspace') return 'Workspace Settings'
  if (pathname === '/account') return 'Account Settings'
  return 'Projects'
}
