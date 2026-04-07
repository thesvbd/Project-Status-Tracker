import type { Phase, PhaseId, UserRole } from '@/types'

export const PHASES: Phase[] = [
  { id: 'not_started',   label: 'Not Started',   bg: 'bg-gray-200',    text: 'text-gray-600',   bar: '#e5e7eb' },
  { id: 'design',        label: 'In Design',      bg: 'bg-violet-100',  text: 'text-violet-700', bar: '#8b5cf6' },
  { id: 'design_review', label: 'Design Review',  bg: 'bg-blue-100',    text: 'text-blue-700',   bar: '#3b82f6' },
  { id: 'development',   label: 'In Development', bg: 'bg-amber-100',   text: 'text-amber-700',  bar: '#f59e0b' },
  { id: 'testing',       label: 'In Testing',     bg: 'bg-orange-100',  text: 'text-orange-700', bar: '#f97316' },
  { id: 'client_review', label: 'Client Review',  bg: 'bg-sky-100',     text: 'text-sky-700',    bar: '#0ea5e9' },
  { id: 'done',          label: 'Done',           bg: 'bg-green-100',   text: 'text-green-700',  bar: '#22c55e' },
]

// Which role is responsible for advancing to the next phase
export const PHASE_OWNER: Record<PhaseId, UserRole | null> = {
  not_started:   'designer' as UserRole,
  design:        'designer' as UserRole,
  design_review: 'pm',
  development:   'freelancer',
  testing:       'freelancer',
  client_review: 'pm',
  done:          null,
}

export function getPhase(id: PhaseId): Phase {
  return PHASES.find(p => p.id === id) ?? PHASES[0]
}

export function nextPhase(id: PhaseId): PhaseId | null {
  const i = PHASES.findIndex(p => p.id === id)
  return i >= 0 && i < PHASES.length - 1 ? PHASES[i + 1].id : null
}

export function prevPhase(id: PhaseId): PhaseId | null {
  const i = PHASES.findIndex(p => p.id === id)
  return i > 0 ? PHASES[i - 1].id : null
}
