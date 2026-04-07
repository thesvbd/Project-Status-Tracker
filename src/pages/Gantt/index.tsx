import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { PHASES, getPhase } from '@/lib/constants'
import type { PhaseId } from '@/types'
import type { Database } from '@/types/database'
import { ChevronLeft, CalendarDays, Plus, Pencil } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { PageDetailSidebar } from '@/components/common/PageDetailSidebar'

type Page = Database['public']['Tables']['pages']['Row']
type Project = Pick<Database['public']['Tables']['projects']['Row'], 'id' | 'name' | 'created_at' | 'deadline'>
export function GanttPage() {
  const { id } = useParams<{ id: string }>()
  const [project, setProject] = useState<Project | null>(null)
  const [pages, setPages] = useState<Page[]>([])
  const [loading, setLoading] = useState(true)
  const [detailPage, setDetailPage] = useState<Page | null>(null)

  useEffect(() => {
    if (!id) return
    Promise.all([
      supabase.from('projects').select('id, name, created_at, deadline').eq('id', id).single(),
      supabase.from('pages').select('*').eq('project_id', id).order('sort_order').order('created_at'),
    ]).then(([{ data: proj }, { data: pgs }]) => {
      setProject(proj)
      setPages(pgs ?? [])
      setLoading(false)
    })
  }, [id])

  if (loading) return <GanttSkeleton />
  if (!project) return <div className="p-6 text-sm text-red-500">Project not found.</div>

  if (pages.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <TopBar projectId={id!} projectName={project.name} start={null} end={null} />
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <CalendarDays className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-700">No pages to display</p>
          <p className="text-sm text-gray-400 mt-1">Add pages to the project first</p>
          <Link to={`/project/${id}`}>
            <Button size="sm" className="mt-4">
              <Plus className="w-4 h-4 mr-1.5" /> Go to pages
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  // ── Date range ─────────────────────────────────────────────
  const rangeStart = new Date(project.created_at)
  rangeStart.setHours(0, 0, 0, 0)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const pagesWithDeadline = pages.filter(p => p.deadline)
  let rangeEnd = new Date(today)
  if (pagesWithDeadline.length > 0) {
    const maxMs = Math.max(...pagesWithDeadline.map(p => new Date(p.deadline!).getTime()))
    if (maxMs > rangeEnd.getTime()) rangeEnd = new Date(maxMs)
  }
  rangeEnd = new Date(rangeEnd.getTime() + 8 * 24 * 60 * 60 * 1000) // +8 day buffer

  const totalMs = rangeEnd.getTime() - rangeStart.getTime()
  const todayPct = Math.max(0, Math.min(100, ((today.getTime() - rangeStart.getTime()) / totalMs) * 100))

  // ── Week markers ────────────────────────────────────────────
  const weeks: Date[] = []
  const w = new Date(rangeStart)
  w.setDate(w.getDate() - ((w.getDay() + 6) % 7)) // back to Monday
  while (w <= rangeEnd) {
    if (w >= rangeStart) weeks.push(new Date(w))
    w.setDate(w.getDate() + 7)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      <TopBar projectId={id!} projectName={project.name} start={rangeStart} end={rangeEnd} />

      <div className="flex-1 overflow-auto">
        <div className="min-w-[560px]">
          {/* Timeline header */}
          <div className="flex sticky top-0 bg-gray-50 border-b border-gray-200 z-10">
            <div className="w-44 sm:w-52 flex-shrink-0 border-r border-gray-200 px-4 py-2 text-xs font-medium text-gray-500">
              Page
            </div>
            <div className="flex-1 relative h-8">
              {weeks.map((week, i) => {
                const pct = ((week.getTime() - rangeStart.getTime()) / totalMs) * 100
                if (pct < 0 || pct > 100) return null
                return (
                  <div key={i} className="absolute top-0 bottom-0" style={{ left: `${pct}%` }}>
                    <div className="h-full w-px bg-gray-200" />
                    <span className="absolute top-1.5 left-1 text-[10px] text-gray-400 whitespace-nowrap select-none">
                      {week.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                )
              })}
              <div className="absolute top-0 bottom-0 w-0.5 bg-blue-400 z-10" style={{ left: `${todayPct}%` }} />
            </div>
          </div>

          {/* Page rows */}
          {pages.map(page => {
            const ph = getPhase(page.phase as PhaseId)
            const hasDeadline = !!page.deadline
            let barWidth = 0
            let isOverdue = false

            if (hasDeadline) {
              const deadlineMs = new Date(page.deadline!).getTime()
              barWidth = Math.min(100, Math.max(1, ((deadlineMs - rangeStart.getTime()) / totalMs) * 100))
              isOverdue = new Date(page.deadline!) < today && page.phase !== 'done'
            }

            const isSelected = detailPage?.id === page.id

            return (
              <div
                key={page.id}
                className={`flex border-b border-gray-100 last:border-0 hover:bg-gray-50/70 transition-colors cursor-pointer ${isSelected ? 'bg-blue-50/40' : ''}`}
                onClick={() => setDetailPage(prev => prev?.id === page.id ? null : page)}
              >
                {/* Name column */}
                <div className="w-44 sm:w-52 flex-shrink-0 border-r border-gray-200 px-4 py-2.5 flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: ph.bar, outline: `2px solid ${ph.bar}`, outlineOffset: '1px' }}
                  />
                  <span className="text-sm text-gray-800 truncate">{page.name}</span>
                </div>

                {/* Bar column */}
                <div className="flex-1 relative px-1 py-2.5">
                  <div className="relative h-5">
                    {hasDeadline ? (
                      <div
                        className={`absolute inset-y-0 rounded flex items-center px-2 text-[10px] font-medium transition-all ${
                          isOverdue ? 'bg-red-100 text-red-600' : `${ph.bg} ${ph.text}`
                        }`}
                        style={{ left: '0%', width: `${barWidth}%`, minWidth: '6px' }}
                      >
                        {barWidth > 12 && (
                          <span className="truncate">
                            {new Date(page.deadline!).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' })}
                            {isOverdue && ' ⚠'}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-300 italic leading-5 pl-2">no deadline</span>
                    )}
                    {/* Today line */}
                    <div className="absolute top-0 bottom-0 w-0.5 bg-blue-400 z-10" style={{ left: `${todayPct}%` }} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="px-4 sm:px-6 py-2.5 border-t border-gray-100 bg-white flex items-center gap-2 flex-wrap flex-shrink-0">
        {PHASES.map(ph => (
          <span key={ph.id} className={`inline-flex items-center text-[11px] px-2 py-0.5 rounded-full font-medium ${ph.bg} ${ph.text}`}>
            {ph.label}
          </span>
        ))}
        <span className="text-xs text-gray-400 flex items-center gap-1.5 ml-auto">
          <span className="inline-block w-4 h-0.5 bg-blue-400 rounded" /> Today
        </span>
      </div>

      {/* Page detail overlay */}
      {detailPage && (
        <div className="absolute top-0 right-0 bottom-0 z-20 flex">
          <PageDetailSidebar
            page={detailPage}
            onClose={() => setDetailPage(null)}
            className="shadow-lg"
            footer={
              <Link to={`/project/${detailPage.project_id}`} className="w-full">
                <Button variant="outline" size="sm" className="w-full">
                  <Pencil className="w-3.5 h-3.5 mr-1.5" /> Open in project
                </Button>
              </Link>
            }
          />
        </div>
      )}
    </div>
  )
}

function TopBar({
  projectId,
  projectName,
  start,
  end,
}: {
  projectId: string
  projectName: string
  start: Date | null
  end: Date | null
}) {
  return (
    <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-gray-200 bg-white flex-shrink-0">
      <Link
        to={`/project/${projectId}`}
        className="flex items-center gap-1 text-sm text-gray-700 hover:text-gray-900 font-medium transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        <span className="truncate max-w-[200px]">{projectName}</span>
      </Link>
      {start && end && (
        <span className="text-xs text-gray-400 flex items-center gap-1.5 hidden sm:flex">
          <CalendarDays className="w-3.5 h-3.5" />
          {start.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' })}
          {' — '}
          {end.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      )}
    </div>
  )
}

function GanttSkeleton() {
  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-3 border-b border-gray-200 bg-white">
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="p-6">
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-200 h-8" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex border-b border-gray-100 last:border-0">
              <div className="w-52 flex-shrink-0 px-4 py-3 border-r border-gray-200">
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="flex-1 px-4 py-3">
                <Skeleton className="h-5 rounded" style={{ width: `${20 + i * 14}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
