import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AppLayout } from '@/components/layout/AppLayout'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { DashboardPage } from '@/pages/Dashboard'
import { ProjectPage } from '@/pages/Project'
import { GanttPage } from '@/pages/Gantt'
import { ArchivePage } from '@/pages/Archive'
import { ProjectSettingsPage } from '@/pages/ProjectSettings'
import { WorkspacePage } from '@/pages/Workspace'
import { ClientsPage } from '@/pages/Clients'
import { AuthPage } from '@/pages/Auth'
import { ClientViewPage } from '@/pages/ClientView'
import { InvitePage } from '@/pages/Invite'
import { AccountPage } from '@/pages/Account'

const router = createBrowserRouter([
  // Veřejné routes (bez sidebaru)
  { path: '/login',           element: <AuthPage /> },
  { path: '/invite/:token',   element: <InvitePage /> },
  { path: '/share/:token',    element: <ClientViewPage /> },

  // Chráněné routes (s AppLayout)
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true,                  element: <Navigate to="/dashboard" replace /> },
          { path: 'dashboard',            element: <DashboardPage /> },
          { path: 'clients',              element: <ClientsPage /> },
          { path: 'archive',              element: <ArchivePage /> },
          { path: 'workspace',            element: <WorkspacePage /> },
          { path: 'project/:id',          element: <ProjectPage /> },
          { path: 'project/:id/gantt',    element: <GanttPage /> },
          { path: 'project/:id/settings', element: <ProjectSettingsPage /> },
          { path: 'account',              element: <AccountPage /> },
        ],
      },
    ],
  },

  // Fallback
  { path: '*', element: <Navigate to="/dashboard" replace /> },
])

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
      <Toaster position="bottom-right" richColors />
    </AuthProvider>
  )
}
