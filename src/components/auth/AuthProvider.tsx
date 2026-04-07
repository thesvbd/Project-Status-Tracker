import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']

export interface CurrentUser {
  user: User
  profile: Profile
}

type AuthState =
  | { status: 'loading' }
  | { status: 'authenticated'; data: CurrentUser }
  | { status: 'unauthenticated' }

const AuthContext = createContext<AuthState>({ status: 'loading' })

export function useAuth(): AuthState {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (cancelled) return

      if (!session?.user) {
        setState({ status: 'unauthenticated' })
        return
      }

      if (
        event === 'INITIAL_SESSION' ||
        event === 'SIGNED_IN' ||
        event === 'TOKEN_REFRESHED' ||
        event === 'USER_UPDATED'
      ) {
        try {
          const profile = await fetchProfileWithRetry(session.user.id)
          if (cancelled) return
          if (profile) {
            setState({ status: 'authenticated', data: { user: session.user, profile } })
          } else {
            setState({ status: 'unauthenticated' })
          }
        } catch {
          if (!cancelled) setState({ status: 'unauthenticated' })
        }
      }
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider value={state}>
      {children}
    </AuthContext.Provider>
  )
}

async function fetchProfileWithRetry(userId: string, attempts = 5, delayMs = 600): Promise<Profile | null> {
  for (let i = 0; i < attempts; i++) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (data) return data
    if (i < attempts - 1) await sleep(delayMs)
  }
  return null
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
