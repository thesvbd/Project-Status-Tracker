import { useEffect, useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
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
import { Plus, Pencil, Trash2, Users } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

type Client = Database['public']['Tables']['clients']['Row']

export function ClientsPage() {
  const userState = useAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)
  const [confirmState, setConfirmState] = useState<{ open: boolean; id: string | null }>({ open: false, id: null })

  const role = userState.status === 'authenticated' ? userState.data.profile.role : null

  useEffect(() => { fetchClients() }, [])

  async function fetchClients() {
    const { data } = await supabase.from('clients').select('*').order('name')
    setClients(data ?? [])
    setLoading(false)
  }

  function openCreate() { setEditing(null); setDialogOpen(true) }
  function openEdit(c: Client) { setEditing(c); setDialogOpen(true) }

  async function handleDeleteConfirmed(id: string) {
    await supabase.from('clients').delete().eq('id', id)
    setClients(prev => prev.filter(c => c.id !== id))
  }

  function handleSaved(client: Client) {
    setClients(prev => {
      const exists = prev.find(c => c.id === client.id)
      return exists
        ? prev.map(c => c.id === client.id ? client : c)
        : [...prev, client].sort((a, b) => a.name.localeCompare(b.name))
    })
    setDialogOpen(false)
  }

  if (userState.status === 'loading') return null
  if (role === 'freelancer') return <Navigate to="/dashboard" replace />

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-gray-900">Clients</h1>
        <Button size="sm" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-1.5" /> Add client
        </Button>
      </div>

      {loading ? (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-2.5 font-medium text-gray-500">Name</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500">Email</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500">Phone</th>
                <th className="w-16" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[...Array(3)].map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-44" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-12 ml-auto" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <Users className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-700">No clients yet</p>
          <p className="text-sm text-gray-400 mt-1">Add your first client to assign them to projects</p>
          <Button size="sm" className="mt-4" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1.5" /> Add client
          </Button>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-2.5 font-medium text-gray-500">Name</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500">Email</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500">Phone</th>
                <th className="w-16" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {clients.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                  <td className="px-4 py-3 text-gray-500">{c.email ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{c.phone ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => openEdit(c)}
                        className="p-1.5 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setConfirmState({ open: true, id: c.id })}
                        className="p-1.5 rounded hover:bg-red-100 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ClientDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        client={editing}
        onSaved={handleSaved}
      />

      <ConfirmDialog
        open={confirmState.open}
        onOpenChange={open => setConfirmState(s => ({ ...s, open }))}
        title="Delete this client?"
        description="This will permanently remove the client. Projects assigned to them will remain."
        confirmLabel="Delete"
        onConfirm={() => confirmState.id && handleDeleteConfirmed(confirmState.id)}
      />
    </div>
  )
}

function ClientDialog({
  open,
  onClose,
  client,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  client: Client | null
  onSaved: (c: Client) => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setName(client?.name ?? '')
      setEmail(client?.email ?? '')
      setPhone(client?.phone ?? '')
      setError(null)
    }
  }, [open, client])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      if (client) {
        const { data, error } = await supabase
          .from('clients')
          .update({ name, email: email || null, phone: phone || null })
          .eq('id', client.id)
          .select()
          .single()
        if (error) throw error
        onSaved(data)
      } else {
        const { data: profile } = await supabase
          .from('profiles')
          .select('workspace_id')
          .single()
        const { data, error } = await supabase
          .from('clients')
          .insert({ name, email: email || null, phone: phone || null, workspace_id: profile!.workspace_id! })
          .select()
          .single()
        if (error) throw error
        onSaved(data)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error saving client')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{client ? 'Edit client' : 'Add client'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="c-name">Name *</Label>
            <Input id="c-name" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-email">Email</Label>
            <Input id="c-email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-phone">Phone</Label>
            <Input id="c-phone" value={phone} onChange={e => setPhone(e.target.value)} />
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
