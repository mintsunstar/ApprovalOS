import { useEffect } from 'react'
import { Link, NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom'
import { useAdminStore } from '@/stores/adminStore'
import { ToastContainer } from '@/components/common/Toast'
import { Button } from '@/components/common/Button'

const nav = [
  { to: '/admin/dashboard', label: '대시보드' },
  { to: '/admin/workspaces', label: '워크스페이스' },
  { to: '/admin/users', label: '사용자' },
  { to: '/admin/plans', label: '플랜' },
  { to: '/admin/notices', label: '공지' },
  { to: '/admin/incidents', label: '점검' },
  { to: '/admin/logs', label: '운영 로그' },
]

export function AdminProtected({ children }: { children: React.ReactNode }) {
  const { admin, loading, init } = useAdminStore()
  useEffect(() => {
    init()
  }, [init])
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    )
  }
  if (!admin) return <Navigate to="/admin/login" replace />
  return <>{children}</>
}

export function AdminLayout() {
  const admin = useAdminStore((s) => s.admin)
  const logout = useAdminStore((s) => s.logout)
  const navigate = useNavigate()

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-lg px-3 py-2 text-sm transition-colors ${
      isActive ? 'bg-accent/15 font-medium text-accent' : 'text-ink-muted hover:bg-surface-raised hover:text-ink'
    }`

  return (
    <div className="flex min-h-screen bg-surface text-ink">
      <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-surface-raised">
        <div className="border-b border-border px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">ApprovalOS</p>
          <p className="text-sm font-semibold">운영 콘솔</p>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 p-3">
          {nav.map((item) => (
            <NavLink key={item.to} to={item.to} className={navClass}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-border p-3">
          <p className="mb-2 truncate px-1 text-xs text-ink-muted">{admin?.email}</p>
          <Button
            size="sm"
            variant="secondary"
            className="w-full"
            onClick={() => {
              logout()
              navigate('/admin/login')
            }}
          >
            로그아웃
          </Button>
          <Link to="/dashboard" className="mt-2 block text-center text-xs text-ink-muted hover:text-accent">
            일반 앱으로
          </Link>
        </div>
      </aside>
      <main className="min-w-0 flex-1 overflow-auto p-6 md:p-8">
        <Outlet />
      </main>
      <ToastContainer />
    </div>
  )
}
