import { useEffect, useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { getPhase } from '@/lib/constants'
import type { PhaseId } from '@/types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Lock, Eye, EyeOff } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

type PageRow = {
  id: string; name: string; type: string; phase: string
  deadline: string | null; notes: string | null; sort_order: number
}
type ClientViewData = {
  project: { id: string; name: string; deadline: string | null }
  pages: PageRow[]
}
type ViewState =
  | { type: 'loading' }
  | { type: 'password_required' }
  | { type: 'error'; message: string }
  | { type: 'ready'; data: ClientViewData }

export function ClientViewPage() {
  const { token } = useParams<{ token: string }>()
  const [viewState, setViewState] = useState<ViewState>({ type: 'loading' })
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [checking, setChecking] = useState(false)
  const [wrongPassword, setWrongPassword] = useState(false)

  async function fetchView(pw?: string) {
    if (!token) return
    const args: Record<string, string> = { p_token: token }
    if (pw) args['p_password'] = pw
    const { data: result, error: err } = await supabase.rpc('get_client_view', args as never)
    if (err) { setViewState({ type: 'error', message: 'Failed to load project.' }); return }
    const res = result as { error?: string } & ClientViewData
    if (!res) { setViewState({ type: 'error', message: 'This link is no longer active.' }); return }
    if (res.error === 'invalid_token') {
      setViewState({ type: 'error', message: 'This link is invalid or has been disabled.' })
    } else if (res.error === 'password_required') {
      setViewState({ type: 'password_required' })
    } else {
      setViewState({ type: 'ready', data: res as ClientViewData })
    }
  }

  useEffect(() => { fetchView() }, [token])

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault()
    if (!password.trim()) return
    setChecking(true)
    setWrongPassword(false)
    const args: Record<string, string> = { p_token: token!, p_password: password.trim() }
    const { data: result } = await supabase.rpc('get_client_view', args as never)
    const res = result as { error?: string } & ClientViewData
    if (res?.error === 'password_required') {
      setWrongPassword(true)
    } else if (res?.error === 'invalid_token') {
      setViewState({ type: 'error', message: 'This link is invalid or has been disabled.' })
    } else {
      setViewState({ type: 'ready', data: res as ClientViewData })
    }
    setChecking(false)
  }

  if (viewState.type === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
            <Skeleton className="h-6 w-48 mb-2" /><Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-200 h-10" />
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex gap-4 px-4 py-3 border-b border-gray-100 last:border-0">
                <Skeleton className="h-4 w-5" /><Skeleton className="h-4 flex-1" />
                <Skeleton className="h-5 w-20 rounded-full" /><Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (viewState.type === 'password_required') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white border border-gray-200 rounded-xl p-8 max-w-sm w-full">
          <div className="flex flex-col items-center mb-6">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <Lock className="w-5 h-5 text-gray-500" />
            </div>
            <h1 className="text-base font-semibold text-gray-900">Password required</h1>
            <p className="text-sm text-gray-500 mt-1 text-center">This project view is password protected.</p>
          </div>
          <form onSubmit={handlePasswordSubmit} className="space-y-3">
            <div className="relative">
              <Input
                type={showPw ? 'text' : 'password'}
                placeholder="Enter password"
                value={password}
                onChange={e => { setPassword(e.target.value); setWrongPassword(false) }}
                className={`pr-9 ${wrongPassword ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
                autoFocus
              />
              <button type="button" onClick={() => setShowPw(v => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {wrongPassword && <p className="text-xs text-red-500">Incorrect password. Please try again.</p>}
            <Button type="submit" className="w-full" disabled={checking || !password.trim()}>
              {checking ? 'Checking…' : 'View project'}
            </Button>
          </form>
        </div>
      </div>
    )
  }

  if (viewState.type === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white border border-gray-200 rounded-xl p-8 max-w-sm w-full text-center">
          <p className="text-sm font-medium text-gray-900 mb-1">Link unavailable</p>
          <p className="text-sm text-gray-500">{viewState.message}</p>
        </div>
      </div>
    )
  }

  const { project, pages: rawPages } = viewState.data
  const pages = rawPages ?? []
  const done = pages.filter(p => p.phase === 'done').length
  const total = pages.length
  const progress = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          <h1 className="text-lg font-semibold text-gray-900">{project.name}</h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-gray-400">
            <span>{done}/{total} pages done</span>
            {project.deadline && (
              <span>Deadline: {new Date(project.deadline).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            )}
          </div>
          {total > 0 && (
            <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-green-400 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        {pages.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">No pages yet.</p>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-2.5 font-medium text-gray-500 w-8">#</th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-500">Page</th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-500">Status</th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-500 hidden sm:table-cell">Deadline</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pages.map((page, i) => {
                    const ph = getPhase(page.phase as PhaseId)
                    const isOverdue = page.deadline && new Date(page.deadline) < new Date() && page.phase !== 'done'
                    return (
                      <tr key={page.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{page.name}</div>
                          {page.notes && <div className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{page.notes}</div>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium ${ph.bg} ${ph.text}`}>{ph.label}</span>
                        </td>
                        <td className={`px-4 py-3 text-xs hidden sm:table-cell ${isOverdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                          {page.deadline ? new Date(page.deadline).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' }) : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <p className="text-xs text-gray-300 text-center mt-6">Read-only view · Project Tracker</p>
      </div>
    </div>
  )
}
