import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/components/auth/AuthProvider'

export function ProtectedRoute() {
  const state = useAuth()

  if (state.status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
      </div>
    )
  }

  if (state.status === 'unauthenticated') {
    return <Navigate to="/login" replace />
  }

  return <Outlet context={state.data} />
}
