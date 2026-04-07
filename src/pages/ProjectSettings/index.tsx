import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import {
  ChevronLeft, Copy, Check, RefreshCw, ExternalLink,
  UserPlus, UserMinus, Lock, Eye, EyeOff,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

type ClientAccess = Database['public']['Tables']['client_access']['Row']
type Project = Pick<Database['public']['Tables']['projects']['Row'], 'id' | 'name' | 'deadline' | 'client_id'>
type Profile = Database['public']['Tables']['profiles']['Row']
type Client = Database['public']['Tables']['clients']['Row']

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner', pm: 'PM', freelancer: 'Freelancer',
}

export function ProjectSettingsPage() {
  const { id } = useParams<{ id: string }>()
  const [project, setProject] = useState<Project | null>(null)
  const [access, setAccess] = useState<ClientAccess | null>(null)
  const [loading, setLoading] = useState(true)

  // Project details edit
  const [editName, setEditName] = useState('')
  const [editClientId, setEditClientId] = useState<string>('none')
  const [editDeadline, setEditDeadline] = useState('')
  const [clients, setClients] = useState<Client[]>([])
  const [savingDetails, setSavingDetails] = useState(false)
  const [detailsSaved, setDetailsSaved] = useState(false)

  // Share link
  const [copied, setCopied] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  // Password gate
  const [passwordInput, setPasswordInput] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [settingPassword, setSettingPassword] = useState(false)
  const [passwordSaved, setPasswordSaved] = useState(false)
  const passwordInputRef = useRef<HTMLInputElement>(null)

  // Project members
  const [workspaceMembers, setWorkspaceMembers] = useState<Profile[]>([])
  const [projectMembers, setProjectMembers] = useState<Profile[]>([])
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [addingMember, setAddingMember] = useState(false)

  // Confirm dialogs
  const [confirmState, setConfirmState] = useState<{ open: boolean; action: 'regenerate' | 'removePassword' | null }>({ open: false, action: null })

  const shareUrl = access ? `${window.location.origin}/share/${access.token}` : ''
  const hasPassword = !!(access?.password_hash)

  useEffect(() => {
    if (!id) return
    Promise.all([
      supabase.from('projects').select('id, name, deadline, client_id').eq('id', id).single(),
      supabase.from('client_access').select('*').eq('project_id', id).maybeSingle(),
      supabase.from('profiles').select('*').order('created_at'),
      supabase.from('project_members').select('user_id').eq('project_id', id),
      supabase.from('clients').select('*').order('name'),
    ]).then(([{ data: proj }, { data: ca }, { data: allMembers }, { data: pm }, { data: cls }]) => {
      setProject(proj as unknown as Project)
      if (proj) {
        setEditName(proj.name)
        setEditClientId(proj.client_id ?? 'none')
        setEditDeadline(proj.deadline ?? '')
      }
      setAccess(ca)
      setClients(cls ?? [])
      const all = allMembers ?? []
      const memberIds = new Set((pm ?? []).map(m => m.user_id))
      setWorkspaceMembers(all)
      // Owner always has access — exclude from project members list
      setProjectMembers(all.filter(m => memberIds.has(m.id) && m.role !== 'owner'))
      setLoading(false)
    })
  }, [id])

  async function handleSaveDetails(e: FormEvent) {
    e.preventDefault()
    if (!id || !editName.trim()) return
    setSavingDetails(true)
    const { data } = await supabase
      .from('projects')
      .update({
        name: editName.trim(),
        client_id: editClientId === 'none' ? null : editClientId,
        deadline: editDeadline || null,
      })
      .eq('id', id)
      .select('id, name, deadline, client_id')
      .single()
    if (data) setProject(data as unknown as Project)
    setSavingDetails(false)
    setDetailsSaved(true)
    setTimeout(() => setDetailsSaved(false), 2000)
  }

  // Owner always has access — exclude from add dropdown
  const availableMembers = workspaceMembers.filter(
    m => m.role !== 'owner' && !projectMembers.find(pm => pm.id === m.id)
  )
  const selectedMemberLabel = selectedMemberId
    ? (() => { const m = availableMembers.find(m => m.id === selectedMemberId); return m ? `${m.name} · ${ROLE_LABELS[m.role] ?? m.role}` : '' })()
    : ''

  // ── Share link handlers ─────────────────────────────────────
  async function handleEnable() {
    if (!id) return
    setToggling(true)
    if (access) {
      const { data } = await supabase
        .from('client_access').update({ enabled: !access.enabled }).eq('id', access.id).select().single()
      if (data) setAccess(data)
    } else {
      const { data } = await supabase
        .from('client_access')
        .insert({ project_id: id, enabled: true, token: crypto.randomUUID() })
        .select().single()
      if (data) setAccess(data)
    }
    setToggling(false)
  }

  async function handleRegenerateConfirmed() {
    if (!access) return
    setRegenerating(true)
    const { data } = await supabase
      .from('client_access').update({ token: crypto.randomUUID() }).eq('id', access.id).select().single()
    if (data) setAccess(data)
    setRegenerating(false)
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Password handlers ───────────────────────────────────────
  async function handleSetPassword(e: FormEvent) {
    e.preventDefault()
    if (!id || !passwordInput.trim()) return
    setSettingPassword(true)
    await supabase.rpc('set_share_password', { p_project_id: id, p_password: passwordInput.trim() })
    setAccess(prev => prev ? { ...prev, password_hash: 'set' } : prev)
    setPasswordInput('')
    setPasswordSaved(true)
    setTimeout(() => setPasswordSaved(false), 2000)
    setSettingPassword(false)
  }

  async function handleRemovePasswordConfirmed() {
    if (!id) return
    setSettingPassword(true)
    await supabase.rpc('set_share_password', { p_project_id: id, p_password: null })
    setAccess(prev => prev ? { ...prev, password_hash: null } : prev)
    setSettingPassword(false)
  }

  // ── Member handlers ─────────────────────────────────────────
  async function handleAddMember() {
    if (!id || !selectedMemberId) return
    setAddingMember(true)
    await supabase.from('project_members').insert({ project_id: id, user_id: selectedMemberId })
    const member = workspaceMembers.find(m => m.id === selectedMemberId)
    if (member) setProjectMembers(prev => [...prev, member])
    setSelectedMemberId('')
    setAddingMember(false)
  }

  async function handleRemoveMember(userId: string) {
    if (!id) return
    await supabase.from('project_members').delete().eq('project_id', id).eq('user_id', userId)
    setProjectMembers(prev => prev.filter(m => m.id !== userId))
  }

  // ── Loading state ───────────────────────────────────────────
  if (loading) return (
    <div className="p-6 max-w-xl space-y-6">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-6 w-44" />
      <div className="space-y-3">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>
      <Separator />
      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />
        {[...Array(2)].map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-lg" />
        ))}
      </div>
    </div>
  )

  if (!project) return <div className="p-6 text-sm text-red-500">Project not found.</div>

  return (
    <div className="p-4 sm:p-6 max-w-xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6">
        <Link
          to={`/project/${id}`}
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          {project.name}
        </Link>
      </div>

      <h1 className="text-lg font-semibold text-gray-900 mb-6">Project Settings</h1>

      {/* ── Project details ────────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-medium text-gray-900">Project details</h2>
          <p className="text-sm text-gray-500 mt-0.5">Edit the project name, client, and deadline.</p>
        </div>
        <form onSubmit={handleSaveDetails} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="ps-name">Name</Label>
            <Input id="ps-name" value={editName} onChange={e => setEditName(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Client</Label>
            <Select value={editClientId} onValueChange={v => setEditClientId(v ?? 'none')}>
              <SelectTrigger>
                <span className="truncate text-sm">
                  {editClientId === 'none'
                    ? <span className="text-muted-foreground">No client</span>
                    : (clients.find(c => c.id === editClientId)?.name ?? <span className="text-muted-foreground">No client</span>)}
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
            <Label htmlFor="ps-deadline">Deadline</Label>
            <Input id="ps-deadline" type="date" value={editDeadline} onChange={e => setEditDeadline(e.target.value)} />
          </div>
          <Button type="submit" size="sm" disabled={savingDetails || !editName.trim()} className="gap-1.5">
            {detailsSaved && <Check className="w-3.5 h-3.5 text-green-400" />}
            {detailsSaved ? 'Saved!' : 'Save changes'}
          </Button>
        </form>
      </section>

      <Separator className="my-6" />

      {/* ── Client share link ──────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-medium text-gray-900">Client share link</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Read-only view of this project for your client. No login required.
          </p>
        </div>

        {/* Toggle */}
        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div>
            <p className="text-sm font-medium text-gray-900">
              {access?.enabled ? 'Link is active' : 'Link is disabled'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {access?.enabled
                ? 'Anyone with the link can view this project.'
                : 'Enable to generate a shareable link.'}
            </p>
          </div>
          <button
            onClick={handleEnable}
            disabled={toggling}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
              access?.enabled ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                access?.enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* URL + actions */}
        {access?.enabled && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input value={shareUrl} readOnly className="text-xs text-gray-600 bg-gray-50" />
              <Button variant="outline" size="sm" onClick={handleCopy} className="flex-shrink-0 gap-1.5">
                {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline" size="sm"
                onClick={() => setConfirmState({ open: true, action: 'regenerate' })} disabled={regenerating}
                className="gap-1.5 text-gray-500"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />
                Regenerate
              </Button>
              <a href={shareUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="gap-1.5 text-gray-500">
                  <ExternalLink className="w-3.5 h-3.5" /> Preview
                </Button>
              </a>
            </div>
          </div>
        )}

        {/* Password protection */}
        {access?.enabled && (
          <div className="border border-gray-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Lock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Password protection</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Visitors must enter a password before they can view this project.
                  </p>
                </div>
              </div>
              <button
                onClick={hasPassword
                  ? () => setConfirmState({ open: true, action: 'removePassword' })
                  : () => setTimeout(() => passwordInputRef.current?.focus(), 0)
                }
                disabled={settingPassword}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
                  hasPassword ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    hasPassword ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {!hasPassword && (
              <form onSubmit={handleSetPassword} className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    ref={passwordInputRef}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Set a password to activate protection…"
                    value={passwordInput}
                    onChange={e => setPasswordInput(e.target.value)}
                    className="pr-8 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <Button type="submit" size="sm" disabled={settingPassword || !passwordInput.trim()} className="flex-shrink-0 gap-1.5">
                  {passwordSaved ? <Check className="w-3.5 h-3.5 text-green-400" /> : null}
                  {passwordSaved ? 'Saved!' : 'Activate'}
                </Button>
              </form>
            )}

            {hasPassword && (
              <p className="text-xs text-green-600 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                Active — toggle off to remove password protection.
              </p>
            )}
          </div>
        )}
      </section>

      <Separator className="my-6" />

      {/* ── Project members ────────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-medium text-gray-900">Project team</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Members assigned to this project can see it in their sidebar.
          </p>
        </div>

        {/* Current members */}
        {projectMembers.length > 0 && (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                {projectMembers.map(m => (
                  <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600 flex-shrink-0">
                          {m.avatar ?? m.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{m.name}</div>
                          <div className="text-xs text-gray-400">{ROLE_LABELS[m.role] ?? m.role}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => handleRemoveMember(m.id)}
                        className="p-1.5 rounded hover:bg-red-100 text-gray-300 hover:text-red-600 transition-colors"
                        title="Remove from project"
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Add member */}
        {availableMembers.length > 0 && (
          <div className="flex gap-2">
            <Select value={selectedMemberId} onValueChange={(v) => setSelectedMemberId(v ?? '')}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Add a team member…">
                  {selectedMemberLabel || undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {availableMembers.map(m => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name} · {ROLE_LABELS[m.role] ?? m.role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleAddMember}
              disabled={!selectedMemberId || addingMember}
              size="sm"
              className="flex-shrink-0 gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" /> Add
            </Button>
          </div>
        )}

        {projectMembers.length === 0 && availableMembers.length === 0 && (
          <p className="text-sm text-gray-400">No workspace members available.</p>
        )}
      </section>

      <ConfirmDialog
        open={confirmState.open}
        onOpenChange={open => setConfirmState(s => ({ ...s, open }))}
        title={
          confirmState.action === 'regenerate'
            ? 'Regenerate share link?'
            : 'Remove password protection?'
        }
        description={
          confirmState.action === 'regenerate'
            ? "The old link will immediately stop working. You'll need to share the new link with your client."
            : 'Anyone with the link will be able to view the project without a password.'
        }
        confirmLabel={confirmState.action === 'regenerate' ? 'Regenerate' : 'Remove'}
        variant="warning"
        onConfirm={() => {
          if (confirmState.action === 'regenerate') handleRegenerateConfirmed()
          if (confirmState.action === 'removePassword') handleRemovePasswordConfirmed()
        }}
      />
    </div>
  )
}
