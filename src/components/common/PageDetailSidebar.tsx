import { useEffect, useState, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { PHASES, getPhase } from '@/lib/constants'
import type { PhaseId } from '@/types'
import type { Database } from '@/types/database'
import { Input } from '@/components/ui/input'
import { ChevronRight, Plus, X, Check, FileText, Copy, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

type Page = Database['public']['Tables']['pages']['Row']
type Subtask = Database['public']['Tables']['subtasks']['Row']
type PageLog = Database['public']['Tables']['page_logs']['Row'] & {
  profiles: { name: string } | null
}

export function PageDetailSidebar({
  page,
  refreshKey,
  onClose,
  phaseAction,
  footer,
  className,
}: {
  page: Page
  refreshKey?: number
  onClose: () => void
  phaseAction?: ReactNode
  footer?: ReactNode
  className?: string
}) {
  const ph = getPhase(page.phase as PhaseId)
  const [subtasks, setSubtasks] = useState<Subtask[]>([])
  const [logs, setLogs] = useState<PageLog[]>([])
  const [newLabel, setNewLabel] = useState('')
  const [activeTab, setActiveTab] = useState<PhaseId>(page.phase as PhaseId)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setActiveTab(page.phase as PhaseId)
  }, [page.id])

  useEffect(() => {
    setSubtasks([])
    setLogs([])
    Promise.all([
      supabase.from('subtasks').select('*').eq('page_id', page.id),
      supabase.from('page_logs').select('*, profiles(name)').eq('page_id', page.id).order('created_at'),
    ]).then(([{ data: st }, { data: lg }]) => {
      setSubtasks(st ?? [])
      setLogs((lg as unknown as PageLog[]) ?? [])
    })
  }, [page.id, refreshKey])

  const tabSubtasks = subtasks.filter(s => s.phase_tag === activeTab)
  const tabPh = getPhase(activeTab)

  async function handleToggle(subtask: Subtask) {
    const { data, error } = await supabase
      .from('subtasks')
      .update({ done: !subtask.done })
      .eq('id', subtask.id)
      .select()
      .single()
    if (error) { toast.error('Failed to update to-do'); return }
    if (data) setSubtasks(prev => prev.map(s => s.id === subtask.id ? data : s))
  }

  async function handleAddSubtask() {
    const label = newLabel.trim()
    if (!label) return
    const { data, error } = await supabase
      .from('subtasks')
      .insert({ page_id: page.id, label, phase_tag: activeTab })
      .select()
      .single()
    if (error) { toast.error('Failed to add to-do'); return }
    if (data) {
      setSubtasks(prev => [...prev, data])
      setNewLabel('')
      inputRef.current?.focus()
    }
  }

  async function handleDeleteSubtask(id: string) {
    const { error } = await supabase.from('subtasks').delete().eq('id', id)
    if (error) { toast.error('Failed to delete to-do'); return }
    setSubtasks(prev => prev.filter(s => s.id !== id))
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') { e.preventDefault(); handleAddSubtask() }
  }

  return (
    <div className={`w-84 border-l border-gray-200 bg-white flex flex-col overflow-hidden flex-shrink-0 ${className ?? ''}`} style={{ width: '22rem' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 gap-2">
        <h2 className="font-medium text-gray-900 truncate text-sm">{page.name}</h2>
        <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-400 flex-shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-sm">
        {/* Phase */}
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">Phase</p>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium ${ph.bg} ${ph.text}`}>
              {ph.label}
            </span>
            {phaseAction}
          </div>
        </div>

        {/* Deadline */}
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Deadline</p>
          <p className="text-gray-700">
            {page.deadline
              ? new Date(page.deadline).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' })
              : '—'}
          </p>
        </div>

        {/* Type */}
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Type</p>
          <p className="text-gray-700">{page.type === 'page' ? 'Page' : 'Global'}</p>
        </div>

        {/* Description */}
        {page.notes && (
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Description</p>
            <p className="text-gray-700 whitespace-pre-wrap">{page.notes}</p>
          </div>
        )}

        {/* Links */}
        {(page.design_link || page.dev_link) && (
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">Links</p>
            <div className="flex flex-col gap-2">
              {page.design_link && (
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-3.5 h-3.5 flex-shrink-0 text-violet-500" />
                  <span className="text-sm text-gray-700 truncate flex-1">Design link</span>
                  <button
                    onClick={() => navigator.clipboard.writeText(page.design_link!)}
                    className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 flex-shrink-0"
                    title="Copy URL"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <a href={page.design_link} target="_blank" rel="noopener noreferrer"
                    className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 flex-shrink-0"
                    title="Open in new tab"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
              {page.dev_link && (
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-3.5 h-3.5 flex-shrink-0 text-amber-500" />
                  <span className="text-sm text-gray-700 truncate flex-1">Dev preview</span>
                  <button
                    onClick={() => navigator.clipboard.writeText(page.dev_link!)}
                    className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 flex-shrink-0"
                    title="Copy URL"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <a href={page.dev_link} target="_blank" rel="noopener noreferrer"
                    className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 flex-shrink-0"
                    title="Open in new tab"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* To-do with phase tabs */}
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">To-do</p>

          {/* Phase tabs */}
          <div className="flex gap-1 flex-wrap mb-3">
            {PHASES.map(p => {
              const count = subtasks.filter(s => s.phase_tag === p.id).length
              const isActive = activeTab === p.id
              const isCurrent = page.phase === p.id
              return (
                <button
                  key={p.id}
                  onClick={() => { setActiveTab(p.id); setNewLabel('') }}
                  className={`relative text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors border ${
                    isActive
                      ? `${p.bg} ${p.text} border-transparent ring-1 ring-offset-1 ring-current`
                      : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300 hover:text-gray-600'
                  }`}
                >
                  {p.label}
                  {count > 0 && (
                    <span className={`ml-1 ${isActive ? 'opacity-70' : 'text-gray-400'}`}>
                      {subtasks.filter(s => s.phase_tag === p.id && s.done).length}/{count}
                    </span>
                  )}
                  {isCurrent && (
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-blue-500 border border-white" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Tab content */}
          {tabSubtasks.length > 0 && (
            <ul className="space-y-1 mb-2">
              {tabSubtasks.map(s => (
                <li key={s.id} className="group flex items-center gap-2">
                  <button
                    onClick={() => handleToggle(s)}
                    className={`w-4 h-4 rounded flex-shrink-0 border flex items-center justify-center transition-colors ${
                      s.done
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {s.done && <Check className="w-2.5 h-2.5" />}
                  </button>
                  <span className={`flex-1 text-sm leading-snug ${s.done ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                    {s.label}
                  </span>
                  <button
                    onClick={() => handleDeleteSubtask(s.id)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-100 text-gray-300 hover:text-red-500 transition-all"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {tabSubtasks.length === 0 && (
            <p className="text-xs text-gray-300 mb-2 italic">No to-dos for {tabPh.label}</p>
          )}

          <div className="flex gap-1.5">
            <Input
              ref={inputRef}
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Add to-do for ${tabPh.label}…`}
              className="h-7 text-xs flex-1"
            />
            <button
              onClick={handleAddSubtask}
              disabled={!newLabel.trim()}
              className="h-7 px-2 rounded border border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Change log */}
        {logs.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">History</p>
            <ol className="space-y-2">
              {logs.map(log => {
                const from = log.from_phase ? getPhase(log.from_phase as PhaseId) : null
                const to = log.to_phase ? getPhase(log.to_phase as PhaseId) : null
                return (
                  <li key={log.id} className="flex gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0 mt-1.5" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 flex-wrap">
                        {from && (
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${from.bg} ${from.text}`}>
                            {from.label}
                          </span>
                        )}
                        {from && to && <ChevronRight className="w-3 h-3 text-gray-300 flex-shrink-0" />}
                        {to && (
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${to.bg} ${to.text}`}>
                            {to.label}
                          </span>
                        )}
                      </div>
                      {log.note && (
                        <p className="text-xs text-gray-500 mt-0.5 italic">"{log.note}"</p>
                      )}
                      <p className="text-xs text-gray-300 mt-0.5">
                        {log.profiles?.name && <span className="text-gray-500 font-medium">{log.profiles.name}</span>}
                        {log.profiles?.name && ' · '}
                        {new Date(log.created_at).toLocaleDateString('cs-CZ', {
                          day: 'numeric', month: 'short',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ol>
          </div>
        )}
      </div>

      {footer && (
        <div className="px-4 py-3 border-t border-gray-100">
          {footer}
        </div>
      )}
    </div>
  )
}
