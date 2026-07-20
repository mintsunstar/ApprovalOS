import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout, AuthLayout } from '@/components/layout/AppLayout'
import { useAuthStore } from '@/stores/authStore'
import { Landing } from '@/pages/Landing'
import { Login, Signup } from '@/pages/Login'
import { Dashboard } from '@/pages/Dashboard'
import { ProjectNew } from '@/pages/ProjectNew'
import { ProjectMain } from '@/pages/ProjectMain'
import { ProjectVote } from '@/pages/ProjectVote'
import { ProjectComments } from '@/pages/ProjectComments'
import { ProjectAnalysis } from '@/pages/ProjectAnalysis'
import { ProjectReport } from '@/pages/ProjectReport'
import { ProjectApproval, ApprovalReview } from '@/pages/ProjectApproval'
import { ProjectSettings } from '@/pages/ProjectSettings'
import { ItemDetail } from '@/pages/ItemDetail'
import { CompareMode } from '@/pages/CompareMode'
import { ApprovalCenter } from '@/pages/ApprovalCenter'
import { Account } from '@/pages/Account'
import { WorkspaceSettings } from '@/pages/WorkspaceSettings'
import { PublicVote } from '@/pages/PublicVote'
import { InviteAccept } from '@/pages/InviteAccept'
import { ToastContainer } from '@/components/common/Toast'

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading, init } = useAuthStore()
  useEffect(() => {
    init()
  }, [init])
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
        </Route>
        <Route path="/vote/:token" element={<PublicVote />} />
        <Route path="/invite/:token" element={<InviteAccept />} />
        <Route
          element={
            <Protected>
              <AppLayout />
            </Protected>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/projects/new" element={<ProjectNew />} />
          <Route path="/projects/:id" element={<ProjectMain />} />
          <Route path="/projects/:id/vote" element={<ProjectVote />} />
          <Route path="/projects/:id/comments" element={<ProjectComments />} />
          <Route path="/projects/:id/analysis" element={<ProjectAnalysis />} />
          <Route path="/projects/:id/report" element={<ProjectReport />} />
          <Route path="/projects/:id/approval" element={<ProjectApproval />} />
          <Route path="/projects/:id/approval/review" element={<ApprovalReview />} />
          <Route path="/projects/:id/settings" element={<ProjectSettings />} />
          <Route path="/projects/:id/items/:itemId" element={<ItemDetail />} />
          <Route path="/approval" element={<ApprovalCenter />} />
          <Route path="/account" element={<Account />} />
          <Route path="/workspace/settings" element={<WorkspaceSettings />} />
        </Route>
        <Route
          path="/projects/:id/compare"
          element={
            <Protected>
              <CompareMode />
              <ToastContainer />
            </Protected>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
