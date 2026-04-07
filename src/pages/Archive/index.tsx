import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/auth/AuthProvider'
import type { Database } from '@/types/database'
import { RotateCcw, Trash2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

type Project = Database['public']['Tables']['projects']['Row'] & {
  clients: { name: string } | null
}

export function ArchivePage() {
  const state = useAuth()
  const profile = state.status === 'authenticated' ? state.data.profile : null
  const isFreelancer = profile?.role === 'freelancer'

  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmState, setConfirmState] = useState<{ open: boolean; id: string | null }>({ open: false, id: null })

  useEffect(() => { if (!isFreelancer) fetchProjects() }, [isFreelancer])

  async function fetchProjects() {
    const { data } = await supabase
      .from('projects')
      .select('*, clients(name)')
      .eq('status', 'archived')
      .order('archived_at', { ascending: false })
    setProjects((data as unknown as Project[]) ?? [])
    setLoading(false)
  }

  async function handleRestore(id: string) {
    await supabase
      .from('projects')
      .update({ status: 'active', archived_at: null })
      .eq('id', id)
    setProjects(prev => prev.filter(p => p.id !== id))
    window.dispatchEvent(new CustomEvent('projects-changed'))
  }

  async function handleDeleteConfirmed(id: string) {
    await supabase.from('projects').delete().eq('id', id)
    setProjects(prev => prev.filter(p => p.id !== id))
  }

  if (isFreelancer) return <Navigate to="/dashboard" replace />

  if (loading) return (
    <div className="p-6 max-w-3xl">
      <Skeleton className="h-6 w-20 mb-6" />
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-2.5 font-medium text-gray-500">Project</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-500">Client</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-500">Archived</th>
              <th className="w-20" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {[...Array(4)].map((_, i) => (
              <tr key={i}>
                <td className="px-4 py-3"><Skeleton className="h-4 w-40" /></td>
                <td className="px-4 py-3"><Skeleton className="h-4 w-28" /></td>
                <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                <td className="px-4 py-3"><Skeleton className="h-4 w-12 ml-auto" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-lg font-semibold text-gray-900 mb-6">Archive</h1>

      {projects.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-sm">No archived projects.</p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-2.5 font-medium text-gray-500">Project</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500">Client</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500">Archived</th>
                <th className="w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {projects.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                  <td className="px-4 py-3 text-gray-500">{p.clients?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {p.archived_at
                      ? new Date(p.archived_at).toLocaleDateString('cs-CZ', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => handleRestore(p.id)}
                        title="Restore to active"
                        className="p-1.5 rounded hover:bg-green-100 text-gray-300 hover:text-green-600 transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setConfirmState({ open: true, id: p.id })}
                        title="Delete permanently"
                        className="p-1.5 rounded hover:bg-red-100 text-gray-300 hover:text-red-600 transition-colors"
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
      <ConfirmDialog
        open={confirmState.open}
        onOpenChange={open => setConfirmState(s => ({ ...s, open }))}
        title="Delete project permanently?"
        description="This will delete the project and all its pages. This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => confirmState.id && handleDeleteConfirmed(confirmState.id)}
      />
    </div>
  )
}
