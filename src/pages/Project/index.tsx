import { useEffect, useState, useRef, type FormEvent, type KeyboardEvent } from 'react'
import { useParams, useLocation, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { PHASES, getPhase } from '@/lib/constants'
import type { PhaseId } from '@/types'
import type { Database } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  SelectValue,
} from '@/components/ui/select'
import { Plus, ChevronRight, Pencil, Trash2, BarChart2, X, Settings, FileText, Bell } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { PageDetailSidebar } from '@/components/common/PageDetailSidebar'

type Page = Database['public']['Tables']['pages']['Row']
type Project = Database['public']['Tables']['projects']['Row'] & {
  clients: { name: string } | null
}
export function ProjectPage() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const [project, setProject] = useState<Project | null>(null)
  const [pages, setPages] = useState<Page[]>([])
  const [loading, setLoading] = useState(true)

  const [pageDialog, setPageDialog] = useState<{ open: boolean; editing: Page | null }>({ open: false, editing: null })
  const [phaseDialog, setPhaseDialog] = useState<{ open: boolean; page: Page | null }>({ open: false, page: null })
  const [detailPage, setDetailPage] = useState<Page | null>(null)
  const [detailRefreshKey, setDetailRefreshKey] = useState(0)
  const [confirmState, setConfirmState] = useState<{ open: boolean; pageId: string | null }>({ open: false, pageId: null })

  useEffect(() => {
    if (!id) return
    Promise.all([
      supabase.from('projects').select('*, clients(name)').eq('id', id).single(),
      supabase.from('pages').select('*').eq('project_id', id).order('sort_order').order('created_at'),
    ]).then(([{ data: proj }, { data: pgs }]) => {
      setProject(proj as unknown as Project)
      setPages(pgs ?? [])
      setLoading(false)
    })
  }, [id])

  // Auto-open page from notification click
  useEffect(() => {
    const openPageId = (location.state as { openPageId?: string } | null)?.openPageId
    if (!openPageId || pages.length === 0) return
    const target = pages.find(p => p.id === openPageId)
    if (target) {
      setDetailPage(target)
      // Clear state so back/forward navigation doesn't re-open
      window.history.replaceState({}, '')
    }
  }, [pages, location.state])

  function handlePageSaved(page: Page) {
    setPages(prev => {
      const exists = prev.find(p => p.id === page.id)
      return exists ? prev.map(p => p.id === page.id ? page : p) : [...prev, page]
    })
    setPageDialog({ open: false, editing: null })
    if (detailPage?.id === page.id) setDetailPage(page)
  }

  async function handlePageDeleteConfirmed(pageId: string) {
    await supabase.from('pages').delete().eq('id', pageId)
    setPages(prev => prev.filter(p => p.id !== pageId))
    if (detailPage?.id === pageId) setDetailPage(null)
  }

  function handlePhaseSaved(updated: Page) {
    setPages(prev => prev.map(p => p.id === updated.id ? updated : p))
    setPhaseDialog({ open: false, page: null })
    if (detailPage?.id === updated.id) setDetailPage(updated)
    setDetailRefreshKey(k => k + 1)
    window.dispatchEvent(new CustomEvent('projects-changed'))
  }

  if (loading) return (
    <div className="flex-1 overflow-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-6 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
      </div>
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-2.5 font-medium text-gray-500 w-6">#</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-500">Page</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-500">Phase</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-500">Deadline</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-500">Type</th>
              <th className="w-24" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {[...Array(5)].map((_, i) => (
              <tr key={i}>
                <td className="px-4 py-3"><Skeleton className="h-4 w-4" /></td>
                <td className="px-4 py-3"><Skeleton className="h-4 w-40" /></td>
                <td className="px-4 py-3"><Skeleton className="h-5 w-20 rounded-full" /></td>
                <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                <td className="px-4 py-3"><Skeleton className="h-4 w-12" /></td>
                <td className="px-4 py-3"><Skeleton className="h-4 w-16 ml-auto" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
  if (!project) return <div className="p-6 text-sm text-red-500">Project not found.</div>

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main content */}
      <div className="flex-1 overflow-auto p-6 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-lg font-semibold text-gray-900">{project.name}</h1>
          <div className="flex gap-2">
            <Link to={`/project/${id}/gantt`}>
              <Button variant="outline" size="sm">
                <BarChart2 className="w-3.5 h-3.5 mr-1.5" /> Gantt
              </Button>
            </Link>
            <Link to={`/project/${id}/settings`}>
              <Button variant="outline" size="sm">
                <Settings className="w-3.5 h-3.5" />
              </Button>
            </Link>
            <Button size="sm" onClick={() => setPageDialog({ open: true, editing: null })}>
              <Plus className="w-4 h-4 mr-1.5" /> Add page
            </Button>
          </div>
        </div>
        {project.clients && (
          <p className="text-sm text-gray-400 mb-6">{project.clients.name}</p>
        )}

        {pages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <FileText className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-700">No pages yet</p>
            <p className="text-sm text-gray-400 mt-1">Add pages to track each part of the project</p>
            <Button size="sm" className="mt-4" onClick={() => setPageDialog({ open: true, editing: null })}>
              <Plus className="w-4 h-4 mr-1.5" /> Add first page
            </Button>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500 w-6">#</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500">Page</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500">Phase</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500">Deadline</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500">Type</th>
                  <th className="w-24" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pages.map((page, i) => {
                  const ph = getPhase(page.phase as PhaseId)
                  const isOverdue = page.deadline && new Date(page.deadline) < new Date() && page.phase !== 'done'
                  return (
                    <tr
                      key={page.id}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => setDetailPage(page)}
                    >
                      <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{page.name}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${ph.bg} ${ph.text}`}>
                          {ph.label}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-xs ${isOverdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                        {page.deadline
                          ? new Date(page.deadline).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' })
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {page.type === 'page' ? 'Page' : 'Global'}
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            title="Change phase"
                            onClick={() => setPhaseDialog({ open: true, page })}
                            className="p-1.5 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                          <button
                            title="Edit"
                            onClick={() => setPageDialog({ open: true, editing: page })}
                            className="p-1.5 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            title="Delete"
                            onClick={() => setConfirmState({ open: true, pageId: page.id })}
                            className="p-1.5 rounded hover:bg-red-100 text-gray-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Page detail slide-over */}
      {detailPage && (
        <PageDetailSidebar
          page={detailPage}
          refreshKey={detailRefreshKey}
          onClose={() => setDetailPage(null)}
          phaseAction={
            <button
              onClick={() => setPhaseDialog({ open: true, page: detailPage })}
              className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-0.5"
            >
              Change <ChevronRight className="w-3 h-3" />
            </button>
          }
          footer={
            <Button variant="outline" size="sm" className="w-full" onClick={() => setPageDialog({ open: true, editing: detailPage })}>
              <Pencil className="w-3.5 h-3.5 mr-1.5" /> Edit page
            </Button>
          }
        />
      )}

      <PageDialog
        open={pageDialog.open}
        editing={pageDialog.editing}
        projectId={id!}
        onClose={() => setPageDialog({ open: false, editing: null })}
        onSaved={handlePageSaved}
      />
      <PhaseChangeDialog
        open={phaseDialog.open}
        page={phaseDialog.page}
        onClose={() => setPhaseDialog({ open: false, page: null })}
        onSaved={handlePhaseSaved}
      />
      <ConfirmDialog
        open={confirmState.open}
        onOpenChange={open => setConfirmState(s => ({ ...s, open }))}
        title="Delete this page?"
        description="All to-dos, phase history and notes for this page will be permanently deleted."
        confirmLabel="Delete"
        onConfirm={() => confirmState.pageId && handlePageDeleteConfirmed(confirmState.pageId)}
      />
    </div>
  )
}

// ─── Page Add/Edit Dialog ──────────────────────────────────

function PageDialog({
  open,
  editing,
  projectId,
  onClose,
  onSaved,
}: {
  open: boolean
  editing: Page | null
  projectId: string
  onClose: () => void
  onSaved: (p: Page) => void
}) {
  const [name, setName] = useState('')
  const [type, setType] = useState<'page' | 'global'>('page')
  const [deadline, setDeadline] = useState('')
  const [notes, setNotes] = useState('')
  const [designLink, setDesignLink] = useState('')
  const [devLink, setDevLink] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setName(editing?.name ?? '')
      setType((editing?.type as 'page' | 'global') ?? 'page')
      setDeadline(editing?.deadline ?? '')
      setNotes(editing?.notes ?? '')
      setDesignLink(editing?.design_link ?? '')
      setDevLink(editing?.dev_link ?? '')
      setError(null)
    }
  }, [open, editing])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const fields = {
        name, type,
        deadline: deadline || null,
        notes: notes || null,
        design_link: designLink || null,
        dev_link: devLink || null,
      }
      if (editing) {
        const { data, error } = await supabase
          .from('pages').update(fields).eq('id', editing.id).select().single()
        if (error) throw error
        onSaved(data)
      } else {
        const { data, error } = await supabase
          .from('pages').insert({ project_id: projectId, ...fields }).select().single()
        if (error) throw error
        onSaved(data)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error saving page')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit page' : 'Add page'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="pg-name">Name *</Label>
            <Input id="pg-name" value={name} onChange={e => setName(e.target.value)} required autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={type} onValueChange={v => setType(v as 'page' | 'global')}>
              <SelectTrigger>
                <SelectValue>{type === 'page' ? 'Page' : 'Global'}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="page">Page</SelectItem>
                <SelectItem value="global">Global</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pg-deadline">Deadline</Label>
            <Input id="pg-deadline" type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pg-notes">Description</Label>
            <Textarea id="pg-notes" value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pg-design">Design link</Label>
            <Input id="pg-design" type="url" placeholder="https://figma.com/…" value={designLink} onChange={e => setDesignLink(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pg-dev">Dev preview link</Label>
            <Input id="pg-dev" type="url" placeholder="https://…" value={devLink} onChange={e => setDevLink(e.target.value)} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Phase Change Dialog ───────────────────────────────────

type ProjectMember = { id: string; name: string }

function PhaseChangeDialog({
  open,
  page,
  onClose,
  onSaved,
}: {
  open: boolean
  page: Page | null
  onClose: () => void
  onSaved: (p: Page) => void
}) {
  const [targetPhase, setTargetPhase] = useState<PhaseId>('not_started')
  const [note, setNote] = useState('')
  const [todos, setTodos] = useState<string[]>([])
  const [newTodo, setNewTodo] = useState('')
  const [saving, setSaving] = useState(false)
  const todoInputRef = useRef<HTMLInputElement>(null)

  // Notifications
  const [notifyEnabled, setNotifyEnabled] = useState(false)
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([])
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (open && page) {
      setTargetPhase(page.phase as PhaseId)
      setNote('')
      setTodos([])
      setNewTodo('')
      setNotifyEnabled(false)
      setSelectedMemberIds(new Set())
      // Fetch notifiable members: owners/PMs from workspace + explicitly assigned freelancers
      ;(async () => {
        const [{ data: pmData }, { data: wsMembers }] = await Promise.all([
          supabase.from('project_members').select('user_id').eq('project_id', page.project_id),
          supabase.from('profiles').select('id, name, role').in('role', ['owner', 'pm']),
        ])
        const explicitIds = new Set((pmData ?? []).map(r => r.user_id))
        const wsMemberIds = new Set((wsMembers ?? []).map(p => p.id))
        // Collect all unique ids: ws owners/PMs + explicit members
        const allIds = Array.from(new Set([...wsMemberIds, ...explicitIds]))
        if (allIds.length === 0) { setProjectMembers([]); return }
        // Fetch names for explicit ids not already in wsMembers
        const missingIds = allIds.filter(id => !wsMemberIds.has(id))
        let extra: { id: string; name: string }[] = []
        if (missingIds.length > 0) {
          const { data } = await supabase.from('profiles').select('id, name').in('id', missingIds)
          extra = data ?? []
        }
        const members: ProjectMember[] = [
          ...(wsMembers ?? []).map(p => ({ id: p.id, name: p.name })),
          ...extra.map(p => ({ id: p.id, name: p.name })),
        ]
        setProjectMembers(members)
        setSelectedMemberIds(new Set(members.map(m => m.id)))
      })()
    }
  }, [open, page])

  function toggleMember(memberId: string) {
    setSelectedMemberIds(prev => {
      const next = new Set(prev)
      if (next.has(memberId)) next.delete(memberId)
      else next.add(memberId)
      return next
    })
  }

  function handleAddTodo() {
    const label = newTodo.trim()
    if (!label) return
    setTodos(prev => [...prev, label])
    setNewTodo('')
    todoInputRef.current?.focus()
  }

  function handleTodoKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') { e.preventDefault(); handleAddTodo() }
  }

  async function handleSave() {
    if (!page) return
    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('pages')
        .update({ phase: targetPhase })
        .eq('id', page.id)
        .select()
        .single()
      if (error) throw error

      const phaseChanged = targetPhase !== page.phase

      if (phaseChanged) {
        await supabase.from('page_logs').insert({
          page_id: page.id,
          from_phase: page.phase,
          to_phase: targetPhase,
          note: note || null,
        })
      }

      // Insert todos for the target phase
      if (todos.length > 0) {
        await supabase.from('subtasks').insert(
          todos.map(label => ({ page_id: page.id, label, phase_tag: targetPhase }))
        )
      }

      // Send notifications to selected members
      if (notifyEnabled && selectedMemberIds.size > 0) {
        const { data: { user } } = await supabase.auth.getUser()
        const recipients = projectMembers.filter(m => selectedMemberIds.has(m.id) && m.id !== user?.id)
        if (recipients.length > 0) {
          const phaseName = getPhase(targetPhase).label
          const message = phaseChanged
            ? `${page.name} moved to ${phaseName}${note ? `: ${note}` : ''}`
            : `Update on ${page.name} (${phaseName})${note ? `: ${note}` : ''}`
          await supabase.from('notifications').insert(
            recipients.map(m => ({
              user_id: m.id,
              project_id: page.project_id,
              page_id: page.id,
              message,
            }))
          )
        }
      }

      onSaved(data)
    } finally {
      setSaving(false)
    }
  }

  if (!page) return null
  const currentPh = getPhase(page.phase as PhaseId)

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Change phase — {page.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium ${currentPh.bg} ${currentPh.text}`}>
              {currentPh.label}
            </span>
            <ChevronRight className="w-4 h-4 text-gray-300" />
            <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium ${getPhase(targetPhase).bg} ${getPhase(targetPhase).text}`}>
              {getPhase(targetPhase).label}
            </span>
          </div>

          <div className="space-y-1.5">
            <Label>New phase</Label>
            <Select value={targetPhase} onValueChange={v => setTargetPhase(v as PhaseId)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PHASES.map(ph => (
                  <SelectItem key={ph.id} value={ph.id}>{ph.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ph-note">Note <span className="text-gray-400 font-normal">(optional)</span></Label>
            <Textarea
              id="ph-note"
              placeholder="What changed? Any context…"
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
            />
          </div>

          {/* To-do for target phase */}
          <div className="space-y-1.5">
            <Label>
              To-do for{' '}
              <span className={`inline-flex items-center text-xs px-1.5 py-0.5 rounded-full font-medium ${getPhase(targetPhase).bg} ${getPhase(targetPhase).text}`}>
                {getPhase(targetPhase).label}
              </span>
              {' '}<span className="text-gray-400 font-normal">(optional)</span>
            </Label>
            {todos.length > 0 && (
              <ul className="space-y-1 mb-1.5">
                {todos.map((t, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="w-3.5 h-3.5 rounded border border-gray-300 flex-shrink-0" />
                    <span className="flex-1">{t}</span>
                    <button
                      type="button"
                      onClick={() => setTodos(prev => prev.filter((_, j) => j !== i))}
                      className="text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-1.5">
              <Input
                ref={todoInputRef}
                value={newTodo}
                onChange={e => setNewTodo(e.target.value)}
                onKeyDown={handleTodoKeyDown}
                placeholder="Add a to-do…"
                className="h-7 text-xs flex-1"
              />
              <button
                type="button"
                onClick={handleAddTodo}
                disabled={!newTodo.trim()}
                className="h-7 px-2 rounded border border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Notify team members */}
          {projectMembers.length > 0 && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setNotifyEnabled(v => !v)}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${notifyEnabled ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                  {notifyEnabled && <X className="w-2.5 h-2.5 text-white" style={{ transform: 'rotate(45deg)' }} />}
                </div>
                <Bell className="w-3.5 h-3.5 text-gray-400" />
                Notify team members
              </button>
              {notifyEnabled && (
                <div className="pl-6 space-y-1.5">
                  {projectMembers.map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleMember(m.id)}
                      className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900 w-full"
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${selectedMemberIds.has(m.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                        {selectedMemberIds.has(m.id) && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 8">
                            <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                      {m.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || targetPhase === page.phase}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
