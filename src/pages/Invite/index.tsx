import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Mail } from 'lucide-react'

export function InvitePage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()

  useEffect(() => {
    if (token) sessionStorage.setItem('invite_token', token)
  }, [token])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white border border-gray-200 rounded-xl p-8 w-full max-w-sm shadow-sm text-center space-y-5">
        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto">
          <Mail className="w-6 h-6 text-blue-600" />
        </div>

        <div>
          <h1 className="text-lg font-semibold text-gray-900">You've been invited</h1>
          <p className="text-sm text-gray-500 mt-1">
            Sign in or create an account to accept the workspace invitation.
          </p>
        </div>

        <Button className="w-full" onClick={() => navigate('/login')}>
          Sign in / Create account
        </Button>
      </div>
    </div>
  )
}
