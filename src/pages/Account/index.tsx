import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Check, TriangleAlert, Building2, LogOut } from 'lucide-react'

type WorkspaceMembership = { workspace_id: string; name: string; role: 'owner' | 'pm' | 'freelancer' }

export function AccountPage() {
  const state = useAuth()
  const profile = state.status === 'authenticated' ? state.data.profile : null
  const email = state.status === 'authenticated' ? (state.data.user.email ?? '') : ''

  // ── Name ────────────────────────────────────────────────────
  const [name, setName] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [nameSaved, setNameSaved] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)

  useEffect(() => {
    if (profile?.name) setName(profile.name)
  }, [profile?.name])

  async function handleNameSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || !profile) return
    setSavingName(true)
    setNameError(null)
    const { error } = await supabase
      .from('profiles')
      .update({ name: name.trim() })
      .eq('id', profile.id)
    if (error) {
      setNameError(error.message)
    } else {
      setNameSaved(true)
      window.dispatchEvent(new CustomEvent('profile-updated'))
      setTimeout(() => setNameSaved(false), 2000)
    }
    setSavingName(false)
  }

  // ── Email ────────────────────────────────────────────────────
  const [newEmail, setNewEmail] = useState('')
  const [savingEmail, setSavingEmail] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)

  async function handleEmailSubmit(e: FormEvent) {
    e.preventDefault()
    if (!newEmail.trim()) return
    setSavingEmail(true)
    setEmailError(null)
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() })
    if (error) {
      setEmailError(error.message)
    } else {
      setEmailSent(true)
      setNewEmail('')
    }
    setSavingEmail(false)
  }

  // ── Password ─────────────────────────────────────────────────
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault()
    setPasswordError(null)
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match')
      return
    }
    setSavingPassword(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      setPasswordError(error.message)
    } else {
      setPasswordSaved(true)
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setPasswordSaved(false), 2000)
    }
    setSavingPassword(false)
  }

  // ── Workspaces ───────────────────────────────────────────────
  const [workspaces, setWorkspaces] = useState<WorkspaceMembership[]>([])
  const [leaveConfirm, setLeaveConfirm] = useState<{ open: boolean; ws: WorkspaceMembership | null }>({ open: false, ws: null })

  useEffect(() => {
    if (state.status !== 'authenticated') return
    supabase
      .from('user_workspaces')
      .select('workspace_id, role, workspaces(name)')
      .then(({ data }) => {
        if (!data) return
        const list: WorkspaceMembership[] = data.map(row => {
          const ws = row.workspaces as { name: string } | null
          return {
            workspace_id: row.workspace_id,
            name: ws?.name ?? '–',
            role: row.role,
          }
        })
        setWorkspaces(list)
      })
  }, [state.status])

  async function handleLeaveWorkspace(ws: WorkspaceMembership) {
    await supabase.rpc('leave_workspace', { p_workspace_id: ws.workspace_id })
    setWorkspaces(prev => prev.filter(w => w.workspace_id !== ws.workspace_id))
    // If they left their current workspace, hard reload to pick up the switched workspace
    if (ws.workspace_id === profile?.workspace_id) {
      window.location.href = '/dashboard'
    }
  }

  // ── Delete account ───────────────────────────────────────────
  const [deleteStep, setDeleteStep] = useState<'idle' | 'confirm'>('idle')
  const [deleteEmailInput, setDeleteEmailInput] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function handleDeleteAccount() {
    if (deleteEmailInput.trim().toLowerCase() !== email.toLowerCase()) {
      setDeleteError('Email does not match')
      return
    }
    setDeleting(true)
    setDeleteError(null)
    const { error } = await supabase.rpc('delete_my_account')
    if (error) {
      setDeleteError(error.message)
      setDeleting(false)
      return
    }
    await supabase.auth.signOut()
  }

  if (state.status === 'loading') return null

  return (
    <div className="p-4 sm:p-6 max-w-xl">
      <h1 className="text-lg font-semibold text-gray-900 mb-6">Account settings</h1>

      {/* ── Profile name ─────────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-medium text-gray-900">Profile</h2>
          <p className="text-sm text-gray-500 mt-0.5">Update your display name.</p>
        </div>
        <form onSubmit={handleNameSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="acc-name">Name</Label>
            <Input
              id="acc-name"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>
          {nameError && <p className="text-sm text-red-600">{nameError}</p>}
          <Button type="submit" size="sm" disabled={savingName || !name.trim()} className="gap-1.5">
            {nameSaved && <Check className="w-3.5 h-3.5 text-green-400" />}
            {nameSaved ? 'Saved!' : 'Save name'}
          </Button>
        </form>
      </section>

      <Separator className="my-6" />

      {/* ── Email ────────────────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-medium text-gray-900">Email</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Current: <span className="font-medium text-gray-700">{email}</span>
          </p>
        </div>
        {emailSent ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
              <Check className="w-4 h-4 flex-shrink-0" />
              Confirmation link sent. Check your inbox to confirm the new address.
            </div>
            <button
              onClick={() => { setEmailSent(false); setEmailError(null) }}
              className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2 transition-colors"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={handleEmailSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="acc-email">New email</Label>
              <Input
                id="acc-email"
                type="email"
                placeholder="new@example.com"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                required
              />
            </div>
            {emailError && <p className="text-sm text-red-600">{emailError}</p>}
            <Button type="submit" size="sm" disabled={savingEmail || !newEmail.trim()}>
              {savingEmail ? 'Sending…' : 'Change email'}
            </Button>
          </form>
        )}
      </section>

      <Separator className="my-6" />

      {/* ── Password ─────────────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-medium text-gray-900">Password</h2>
          <p className="text-sm text-gray-500 mt-0.5">Choose a new password.</p>
        </div>
        <form onSubmit={handlePasswordSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="acc-pw-new">New password</Label>
            <Input
              id="acc-pw-new"
              type="password"
              placeholder="Min. 6 characters"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="acc-pw-confirm">Confirm password</Label>
            <Input
              id="acc-pw-confirm"
              type="password"
              placeholder="Repeat the password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}
          <Button
            type="submit"
            size="sm"
            disabled={savingPassword || !newPassword || !confirmPassword}
            className="gap-1.5"
          >
            {passwordSaved && <Check className="w-3.5 h-3.5 text-green-400" />}
            {passwordSaved ? 'Updated!' : 'Update password'}
          </Button>
        </form>
      </section>

      {workspaces.length > 0 && (
        <>
          <Separator className="my-6" />
          <section className="space-y-4">
            <div>
              <h2 className="text-sm font-medium text-gray-900">Workspaces</h2>
              <p className="text-sm text-gray-500 mt-0.5">Workspaces you are a member of.</p>
            </div>
            <div className="border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-100">
              {workspaces.map(ws => (
                <div key={ws.workspace_id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{ws.name}</p>
                    <p className="text-xs text-gray-400 capitalize">{ws.role}</p>
                  </div>
                  {ws.role !== 'owner' && (
                    <button
                      onClick={() => setLeaveConfirm({ open: true, ws })}
                      title="Leave workspace"
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs text-gray-500 hover:bg-red-50 hover:text-red-600 border border-gray-200 hover:border-red-200 transition-colors flex-shrink-0"
                    >
                      <LogOut className="w-3 h-3" />
                      Leave
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      <Separator className="my-6" />

      {/* ── Danger zone ───────────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-medium text-red-600">Danger zone</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Permanently delete your account and all associated data.
          </p>
        </div>

        <div className="border border-red-200 rounded-lg p-4 space-y-3">
          {deleteStep === 'idle' ? (
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-gray-600">
                This action is <span className="font-medium text-gray-900">irreversible</span>. Your profile, notifications and membership in all projects will be permanently removed.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteStep('confirm')}
                className="flex-shrink-0 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
              >
                Delete account
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 rounded-md px-3 py-2.5">
                <TriangleAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>To confirm, type your email address <span className="font-medium">{email}</span> below.</span>
              </div>
              <Input
                type="email"
                placeholder={email}
                value={deleteEmailInput}
                onChange={e => { setDeleteEmailInput(e.target.value); setDeleteError(null) }}
                className="border-red-200 focus-visible:ring-red-400"
                autoFocus
              />
              {deleteError && <p className="text-sm text-red-600">{deleteError}</p>}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setDeleteStep('idle'); setDeleteEmailInput(''); setDeleteError(null) }}
                  disabled={deleting}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleDeleteAccount}
                  disabled={deleting || deleteEmailInput.trim().toLowerCase() !== email.toLowerCase()}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {deleting ? 'Deleting…' : 'Permanently delete my account'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>
      <ConfirmDialog
        open={leaveConfirm.open}
        onOpenChange={open => setLeaveConfirm(s => ({ ...s, open }))}
        title={`Leave "${leaveConfirm.ws?.name}"?`}
        description="You will lose access to all projects in this workspace. You can rejoin only via a new invite."
        confirmLabel="Leave workspace"
        variant="danger"
        onConfirm={() => leaveConfirm.ws && handleLeaveWorkspace(leaveConfirm.ws)}
      />
    </div>
  )
}
