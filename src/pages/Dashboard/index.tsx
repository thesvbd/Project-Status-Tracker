import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/auth/AuthProvider'
import type { Database } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import { Plus, CalendarDays, Archive, Mail, Check, X, FolderOpen } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

type Invite = Database['public']['Tables']['workspace_invites']['Row'] & {
  workspaces: { name: string } | null
}

type Project = Database['public']['Tables']['projects']['Row'] & {
  clients: { name: string } | null
  pages: { phase: string }[]
}
type Client = Database['public']['Tables']['clients']['Row']

export function DashboardPage() {
  const state = useAuth()
  const profile = state.status === 'authenticated' ? state.data.profile : null
  const isFreelancer = profile?.role === 'freelancer'

  const [projects, setProjects] = useState<Project[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [confirmState, setConfirmState] = useState<{ open: boolean; id: string | null }>({ open: false, id: null })

  useEffect(() => { fetchProjects(); fetchInvites() }, [])

  async function fetchInvites() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) return
    const { data } = await supabase
      .from('workspace_invites')
      .select('*, workspaces(name)')
      .eq('status', 'pending')
      .eq('email', user.email)
    setInvites((data as unknown as Invite[]) ?? [])
  }

  async function handleAcceptInvite(token: string) {
    await supabase.rpc('accept_workspace_invite', { p_token: token })
    // Refresh page to reflect new workspace
    window.location.reload()
  }

  async function handleDeclineInvite(token: string) {
    await supabase.rpc('decline_workspace_invite', { p_token: token })
    setInvites(prev => prev.filter(i => i.token !== token))
  }

  async function fetchProjects() {
    const { data } = await supabase
      .from('projects')
      .select('*, clients(name), pages(phase)')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
    setProjects((data as unknown as Project[]) ?? [])
    setLoading(false)
  }

  async function handleArchiveConfirmed(id: string) {
    await supabase
      .from('projects')
      .update({ status: 'archived', archived_at: new Date().toISOString() })
      .eq('id', id)
    setProjects(prev => prev.filter(p => p.id !== id))
    window.dispatchEvent(new CustomEvent('projects-changed'))
  }

  function handleCreated(project: Project) {
    setProjects(prev => [project, ...prev])
    setDialogOpen(false)
    window.dispatchEvent(new CustomEvent('projects-changed'))
  }

  if (loading) return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-8 w-28 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="w-6 h-6 rounded flex-shrink-0" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-2 w-full rounded-full" />
              <div className="flex justify-between">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-gray-900">Dashboard</h1>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> New project
        </Button>
      </div>

      {/* Pending invites */}
      {invites.map(invite => (
        <div
          key={invite.id}
          className="mb-4 flex items-center justify-between gap-4 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3"
        >
          <div className="flex items-center gap-3 min-w-0">
            <Mail className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <p className="text-sm text-blue-900">
              You've been invited to join{' '}
              <span className="font-semibold">{invite.workspaces?.name ?? 'a workspace'}</span>
              {' '}as <span className="font-semibold capitalize">{invite.role}</span>.
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs border-blue-300 text-blue-700 hover:bg-blue-100"
              onClick={() => handleDeclineInvite(invite.token)}
            >
              <X className="w-3 h-3 mr-1" /> Decline
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs bg-blue-600 hover:bg-blue-700"
              onClick={() => handleAcceptInvite(invite.token)}
            >
              <Check className="w-3 h-3 mr-1" /> Accept
            </Button>
          </div>
        </div>
      ))}

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <FolderOpen className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-700">No active projects yet</p>
          <p className="text-sm text-gray-400 mt-1">Create your first project to get started</p>
          <Button size="sm" className="mt-4" onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> New project
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(p => (
            <ProjectCard
              key={p.id}
              project={p}
              onArchive={isFreelancer ? undefined : id => setConfirmState({ open: true, id })}
            />
          ))}
        </div>
      )}

      <NewProjectDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={handleCreated}
      />

      <ConfirmDialog
        open={confirmState.open}
        onOpenChange={open => setConfirmState(s => ({ ...s, open }))}
        title="Archive this project?"
        description="The project will be moved to the archive. You can restore it at any time."
        confirmLabel="Archive"
        variant="warning"
        onConfirm={() => confirmState.id && handleArchiveConfirmed(confirmState.id)}
      />
    </div>
  )
}

function ProjectCard({
  project,
  onArchive,
}: {
  project: Project
  onArchive?: (id: string) => void
}) {
  const pages = project.pages ?? []
  const total = pages.length
  const done = pages.filter(p => p.phase === 'done').length
  const isOverdue = project.deadline && new Date(project.deadline) < new Date()

  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <Link
      to={`/project/${project.id}`}
      className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3 hover:shadow-sm hover:border-gray-300 transition-all block"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-gray-900 truncate">{project.name}</p>
          {project.clients && (
            <p className="text-xs text-gray-400 mt-0.5 truncate">{project.clients.name}</p>
          )}
        </div>
        {onArchive && (
          <div className="flex gap-1 flex-shrink-0">
            <button
              onClick={e => { e.preventDefault(); onArchive(project.id) }}
              title="Archive"
              className="p-1.5 rounded hover:bg-gray-100 text-gray-300 hover:text-gray-500 transition-colors"
            >
              <Archive className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {total > 0 ? (
        <div className="space-y-1.5">
          <div className="h-2 rounded-full overflow-hidden bg-gray-100">
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400">
            <span>{done}/{total} done</span>
            {project.deadline && (
              <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-500' : ''}`}>
                <CalendarDays className="w-3 h-3" />
                {new Date(project.deadline).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' })}
              </span>
            )}
          </div>
        </div>
      ) : (
        <p className="text-xs text-gray-400">No pages yet</p>
      )}
    </Link>
  )
}

function NewProjectDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: (p: Project) => void
}) {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [clientId, setClientId] = useState<string>('none')
  const [deadline, setDeadline] = useState('')
  const [clients, setClients] = useState<Client[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setName(''); setClientId('none'); setDeadline(''); setError(null)
      supabase.from('clients').select('*').order('name').then(({ data }) => setClients(data ?? []))
    }
  }, [open])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const { data: workspaceId, error: wsError } = await supabase.rpc('my_workspace_id')
      if (wsError || !workspaceId) throw new Error(wsError?.message ?? 'Could not determine workspace')
      const { data, error } = await supabase
        .from('projects')
        .insert({
          name,
          workspace_id: workspaceId,
          client_id: clientId === 'none' ? null : clientId,
          deadline: deadline || null,
        })
        .select('*, clients(name), pages(phase)')
        .single()
      if (error) throw new Error(error.message)
      onCreated(data as unknown as Project)
      navigate(`/project/${data.id}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error creating project')
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="p-name">Name *</Label>
            <Input id="p-name" value={name} onChange={e => setName(e.target.value)} required autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label>Client</Label>
            <Select value={clientId} onValueChange={(v) => setClientId(v ?? 'none')}>
              <SelectTrigger>
                <span className="truncate text-sm">
                  {clientId === 'none'
                    ? <span className="text-muted-foreground">No client</span>
                    : (clients.find(c => c.id === clientId)?.name ?? <span className="text-muted-foreground">No client</span>)}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No client</SelectItem>
                {clients.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-deadline">Deadline</Label>
            <Input id="p-deadline" type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
