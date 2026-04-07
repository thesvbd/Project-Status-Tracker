export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      workspaces: {
        Row: { id: string; name: string; created_at: string }
        Insert: { id?: string; name: string; created_at?: string }
        Update: { id?: string; name?: string; created_at?: string }
        Relationships: []
      }
      profiles: {
        Row: { id: string; workspace_id: string | null; name: string; avatar: string | null; role: 'owner' | 'pm' | 'freelancer'; is_external: boolean; created_at: string }
        Insert: { id: string; workspace_id?: string | null; name: string; avatar?: string | null; role?: 'owner' | 'pm' | 'freelancer'; is_external?: boolean; created_at?: string }
        Update: { id?: string; workspace_id?: string | null; name?: string; avatar?: string | null; role?: 'owner' | 'pm' | 'freelancer'; is_external?: boolean; created_at?: string }
        Relationships: []
      }
      clients: {
        Row: { id: string; workspace_id: string; name: string; email: string | null; phone: string | null; created_at: string }
        Insert: { id?: string; workspace_id: string; name: string; email?: string | null; phone?: string | null; created_at?: string }
        Update: { id?: string; workspace_id?: string; name?: string; email?: string | null; phone?: string | null; created_at?: string }
        Relationships: []
      }
      projects: {
        Row: { id: string; workspace_id: string; client_id: string | null; name: string; deadline: string | null; status: 'active' | 'archived'; created_at: string; archived_at: string | null }
        Insert: { id?: string; workspace_id: string; client_id?: string | null; name: string; deadline?: string | null; status?: 'active' | 'archived'; created_at?: string; archived_at?: string | null }
        Update: { id?: string; workspace_id?: string; client_id?: string | null; name?: string; deadline?: string | null; status?: 'active' | 'archived'; created_at?: string; archived_at?: string | null }
        Relationships: []
      }
      project_members: {
        Row: { project_id: string; user_id: string }
        Insert: { project_id: string; user_id: string }
        Update: { project_id?: string; user_id?: string }
        Relationships: []
      }
      pages: {
        Row: { id: string; project_id: string; name: string; type: 'page' | 'global'; phase: string; deadline: string | null; sort_order: number; notes: string | null; design_link: string | null; dev_link: string | null; created_at: string }
        Insert: { id?: string; project_id: string; name: string; type?: 'page' | 'global'; phase?: string; deadline?: string | null; sort_order?: number; notes?: string | null; design_link?: string | null; dev_link?: string | null; created_at?: string }
        Update: { id?: string; project_id?: string; name?: string; type?: 'page' | 'global'; phase?: string; deadline?: string | null; sort_order?: number; notes?: string | null; design_link?: string | null; dev_link?: string | null; created_at?: string }
        Relationships: []
      }
      subtasks: {
        Row: { id: string; page_id: string; label: string; done: boolean; phase_tag: string | null }
        Insert: { id?: string; page_id: string; label: string; done?: boolean; phase_tag?: string | null }
        Update: { id?: string; page_id?: string; label?: string; done?: boolean; phase_tag?: string | null }
        Relationships: []
      }
      page_logs: {
        Row: { id: string; page_id: string; user_id: string | null; from_phase: string | null; to_phase: string | null; note: string | null; created_at: string }
        Insert: { id?: string; page_id: string; user_id?: string | null; from_phase?: string | null; to_phase?: string | null; note?: string | null; created_at?: string }
        Update: { id?: string; page_id?: string; user_id?: string | null; from_phase?: string | null; to_phase?: string | null; note?: string | null; created_at?: string }
        Relationships: []
      }
      notifications: {
        Row: { id: string; user_id: string; project_id: string | null; page_id: string | null; message: string; read: boolean; created_at: string }
        Insert: { id?: string; user_id: string; project_id?: string | null; page_id?: string | null; message: string; read?: boolean; created_at?: string }
        Update: { id?: string; user_id?: string; project_id?: string | null; page_id?: string | null; message?: string; read?: boolean; created_at?: string }
        Relationships: []
      }
      client_access: {
        Row: { id: string; project_id: string; token: string; enabled: boolean; password_hash: string | null }
        Insert: { id?: string; project_id: string; token: string; enabled?: boolean; password_hash?: string | null }
        Update: { id?: string; project_id?: string; token?: string; enabled?: boolean; password_hash?: string | null }
        Relationships: []
      }
      workspace_invites: {
        Row: { id: string; workspace_id: string; email: string; role: 'pm' | 'freelancer'; token: string; status: 'pending' | 'accepted' | 'declined'; created_by: string | null; created_at: string; accepted_at: string | null }
        Insert: { id?: string; workspace_id: string; email: string; role: 'pm' | 'freelancer'; token?: string; status?: 'pending' | 'accepted' | 'declined'; created_by?: string | null; created_at?: string; accepted_at?: string | null }
        Update: { id?: string; workspace_id?: string; email?: string; role?: 'pm' | 'freelancer'; token?: string; status?: 'pending' | 'accepted' | 'declined'; created_by?: string | null; created_at?: string; accepted_at?: string | null }
        Relationships: []
      }
      user_workspaces: {
        Row: { user_id: string; workspace_id: string; role: 'owner' | 'pm' | 'freelancer'; joined_at: string }
        Insert: { user_id: string; workspace_id: string; role?: 'owner' | 'pm' | 'freelancer'; joined_at?: string }
        Update: { user_id?: string; workspace_id?: string; role?: 'owner' | 'pm' | 'freelancer'; joined_at?: string }
        Relationships: [
          { foreignKeyName: "user_workspaces_workspace_id_fkey"; columns: ["workspace_id"]; isOneToOne: false; referencedRelation: "workspaces"; referencedColumns: ["id"] }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      my_workspace_id: { Args: Record<PropertyKey, never>; Returns: string }
      my_role: { Args: Record<PropertyKey, never>; Returns: string }
      is_project_member: { Args: { p_project_id: string }; Returns: boolean }
      accept_workspace_invite: { Args: { p_token: string }; Returns: void }
      decline_workspace_invite: { Args: { p_token: string }; Returns: void }
      switch_workspace: { Args: { p_workspace_id: string }; Returns: void }
      get_client_view: { Args: { p_token: string; p_password?: string | null }; Returns: Json }
      set_share_password: { Args: { p_project_id: string; p_password: string | null }; Returns: void }
      delete_my_account: { Args: Record<PropertyKey, never>; Returns: void }
      leave_workspace: { Args: { p_workspace_id: string }; Returns: void }
      remove_workspace_member: { Args: { p_user_id: string }; Returns: void }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
