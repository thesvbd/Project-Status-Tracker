import { useEffect, useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/auth/AuthProvider'
import type { Database } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { UserMinus, Mail, X, Pencil } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { toast } from 'sonner'

type Profile = Database['public']['Tables']['profiles']['Row']
type Invite = Database['public']['Tables']['workspace_invites']['Row']
type InviteRole = 'pm' | 'freelancer'
type MemberRole = 'pm' | 'freelancer'

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  pm: 'Project Manager',
  freelancer: 'Freelancer',
}

const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-purple-100 text-purple-700',
  pm: 'bg-blue-100 text-blue-700',
  freelancer: 'bg-gray-100 text-gray-600',
}

export function WorkspacePage() {
  const currentUserState = useAuth()
  const [workspaceName, setWorkspaceName] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [members, setMembers] = useState<Profile[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<InviteRole>('pm')
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviting, setInviting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [confirmState, setConfirmState] = useState<{ open: boolean; id: string | null }>({ open: false, id: null })

  const currentProfile = currentUserState.status === 'authenticated' ? currentUserState.data.profile : null
  const isOwner = currentProfile?.role === 'owner'

  useEffect(() => {
    if (currentUserState.status !== 'authenticated') return
    Promise.all([fetchWorkspace(), fetchMembers(), fetchInvites()]).then(() => setLoading(false))
  }, [currentUserState.status])

  async function fetchWorkspace() {
    const { data } = await supabase.from('workspaces').select('name').single()
    if (data) { setWorkspaceName(data.name); setNameInput(data.name) }
  }

  async function fetchMembers() {
    const { data } = await supabase.from('profiles').select('*').order('created_at')
    setMembers(data ?? [])
  }

  async function fetchInvites() {
    const { data } = await supabase
      .from('workspace_invites')
      .select('*')
      .eq('status', 'pending')
      .order('created_at')
    setInvites(data ?? [])
  }

  async function handleSaveName() {
    if (!nameInput.trim() || !currentProfile?.workspace_id) return
    await supabase.from('workspaces').update({ name: nameInput.trim() }).eq('id', currentProfile.workspace_id)
    setWorkspaceName(nameInput.trim())
    setEditingName(false)
  }

  async function handleChangeRole(userId: string, role: MemberRole) {
    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      supabase.from('profiles').update({ role }).eq('id', userId),
      supabase.from('user_workspaces').update({ role }).eq('user_id', userId).eq('workspace_id', currentProfile!.workspace_id!),
    ])
    if (e1 || e2) {
      toast.error('Failed to update role')
      return
    }
    setMembers(prev => prev.map(m => m.id === userId ? { ...m, role } : m))
    toast.success('Role updated')
  }

  async function handleRemoveMemberConfirmed(userId: string) {
    // Atomically removes user from user_workspaces + nulls their workspace_id
    await supabase.rpc('remove_workspace_member', { p_user_id: userId })
    setMembers(prev => prev.filter(m => m.id !== userId))
  }

  async function handleCancelInvite(id: string) {
    await supabase.from('workspace_invites').update({ status: 'declined' }).eq('id', id)
    setInvites(prev => prev.filter(i => i.id !== id))
  }

  async function handleInvite(e: FormEvent) {
    e.preventDefault()
    setInviteError(null)
    setInviting(true)
    try {
      const { error } = await supabase
        .from('workspace_invites')
        .insert({
          workspace_id: currentProfile!.workspace_id!,
          email: inviteEmail.trim().toLowerCase(),
          role: inviteRole,
          created_by: currentProfile!.id,
        })
      if (error) throw error
      setInviteEmail('')
      await fetchInvites()
    } catch (err: unknown) {
      setInviteError(err instanceof Error ? err.message : 'Error sending invite')
    } finally {
      setInviting(false)
    }
  }

  if (currentUserState.status === 'loading') return null
  if (!isOwner) return <Navigate to="/dashboard" replace />

  if (loading) return (
    <div className="p-6 max-w-2xl space-y-8">
      <section>
        <Skeleton className="h-3 w-20 mb-3" />
        <Skeleton className="h-6 w-48" />
      </section>
      <Separator />
      <section>
        <Skeleton className="h-3 w-16 mb-3" />
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-2.5 font-medium text-gray-500">Name</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[...Array(3)].map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Skeleton className="w-7 h-7 rounded-full flex-shrink-0" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </td>
                  <td className="px-4 py-3"><Skeleton className="h-5 w-24 rounded-full" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )

  return (
    <div className="p-6 max-w-2xl space-y-8">

      {/* Workspace name */}
      <section>
        <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Workspace</h2>
        <div className="flex items-center gap-3">
          {editingName ? (
            <>
              <Input
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                className="max-w-xs"
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSaveName()
                  if (e.key === 'Escape') { setEditingName(false); setNameInput(workspaceName) }
                }}
              />
              <Button size="sm" onClick={handleSaveName}>Save</Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setEditingName(false); setNameInput(workspaceName) }}
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              <span className="text-base font-semibold text-gray-900">{workspaceName}</span>
              {isOwner && (
                <button
                  onClick={() => setEditingName(true)}
                  className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
            </>
          )}
        </div>
      </section>

      <Separator />

      {/* Members */}
      <section>
        <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Members</h2>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-2.5 font-medium text-gray-500">Name</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500">Role</th>
                {isOwner && <th className="w-14" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {members.map(m => (
                <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600 flex-shrink-0">
                        {m.avatar ?? m.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{m.name}</div>
                        {m.id === currentProfile?.id && (
                          <div className="text-xs text-gray-400">You</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {isOwner && m.id !== currentProfile?.id && m.role !== 'owner' ? (
                      <Select
                        value={m.role}
                        onValueChange={v => handleChangeRole(m.id, v as MemberRole)}
                      >
                        <SelectTrigger className="h-7 w-40 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pm">Project Manager</SelectItem>
                          <SelectItem value="freelancer">Freelancer</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[m.role] ?? 'bg-gray-100 text-gray-600'}`}>
                        {ROLE_LABELS[m.role] ?? m.role}
                      </span>
                    )}
                  </td>
                  {isOwner && (
                    <td className="px-4 py-3 text-right">
                      {m.id !== currentProfile?.id && m.role !== 'owner' && (
                        <button
                          onClick={() => setConfirmState({ open: true, id: m.id })}
                          title="Remove member"
                          className="p-1.5 rounded hover:bg-red-100 text-gray-300 hover:text-red-600 transition-colors"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Pending invites */}
      {isOwner && invites.length > 0 && (
        <>
          <Separator />
          <section>
            <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Pending invites</h2>
            <div className="space-y-2">
              {invites.map(invite => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between gap-3 border border-gray-200 rounded-lg px-4 py-2.5"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-700 truncate">{invite.email}</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${ROLE_COLORS[invite.role] ?? 'bg-gray-100 text-gray-600'}`}>
                      {ROLE_LABELS[invite.role] ?? invite.role}
                    </span>
                  </div>
                  <button
                    onClick={() => handleCancelInvite(invite.id)}
                    title="Cancel invite"
                    className="p-1.5 rounded hover:bg-red-100 text-gray-300 hover:text-red-600 transition-colors flex-shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {/* Invite form */}
      {isOwner && (
        <>
          <Separator />
          <section>
            <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Invite member</h2>
            <form onSubmit={handleInvite} className="flex gap-3 items-end flex-wrap">
              <div className="space-y-1.5 flex-1 min-w-48">
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="colleague@example.com"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5 w-44">
                <Label>Role</Label>
                <Select value={inviteRole} onValueChange={v => setInviteRole(v as InviteRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pm">Project Manager</SelectItem>
                    <SelectItem value="freelancer">Freelancer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={inviting} className="flex-shrink-0">
                {inviting ? 'Sending…' : 'Send invite'}
              </Button>
            </form>
            {inviteError && <p className="mt-2 text-sm text-red-600">{inviteError}</p>}
          </section>
        </>
      )}

      <ConfirmDialog
        open={confirmState.open}
        onOpenChange={open => setConfirmState(s => ({ ...s, open }))}
        title="Remove member from workspace?"
        description="They will lose access to all projects in this workspace immediately."
        confirmLabel="Remove"
        onConfirm={() => confirmState.id && handleRemoveMemberConfirmed(confirmState.id)}
      />
    </div>
  )
}
