// ============================================================
// PHASES
// ============================================================

export type PhaseId =
  | 'not_started'
  | 'design'
  | 'design_review'
  | 'development'
  | 'testing'
  | 'client_review'
  | 'done'

export interface Phase {
  id: PhaseId
  label: string
  bg: string
  text: string
  bar: string
}

// ============================================================
// ROLES
// ============================================================

export type UserRole = 'owner' | 'pm' | 'freelancer'

// ============================================================
// DATABASE ENTITIES
// ============================================================

export interface Workspace {
  id: string
  name: string
  created_at: string
}

export interface Profile {
  id: string
  workspace_id: string
  name: string
  avatar: string        // iniciály generované z name
  role: UserRole
  is_external: boolean
  created_at: string
}

export interface Client {
  id: string
  workspace_id: string
  name: string
  email: string | null
  phone: string | null
  created_at: string
}

export interface Project {
  id: string
  workspace_id: string
  client_id: string | null
  name: string
  deadline: string | null   // ISO date string "YYYY-MM-DD"
  status: 'active' | 'archived'
  created_at: string
  archived_at: string | null
  members?: string[]        // pole profile.id, z joinu project_members
}

export interface Page {
  id: string
  project_id: string
  name: string
  type: 'page' | 'global'
  phase: PhaseId
  deadline: string | null
  sort_order: number
  notes: string | null
  created_at: string
}

export interface Subtask {
  id: string
  page_id: string
  label: string
  done: boolean
  phase_tag: PhaseId | null  // ke které fázi todo patří
}

export interface PageLog {
  id: string
  page_id: string
  user_id: string
  from_phase: PhaseId | null
  to_phase: PhaseId
  note: string | null
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  project_id: string
  page_id: string
  message: string
  read: boolean
  created_at: string
}

export interface ClientAccess {
  id: string
  project_id: string
  token: string
  enabled: boolean
  password_hash: string | null
}
