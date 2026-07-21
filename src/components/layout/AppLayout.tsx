import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { ToastContainer } from '@/components/common/Toast'
import { localApi } from '@/lib/localDb'
import { getProjectPageLabel } from '@/components/layout/ProjectLayout'

function IconHome({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1v-10.5z" />
    </svg>
  )
}
function IconPlus({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}
function IconUsers({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}
function IconCheck({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  )
}
function IconSettings({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}
function IconBell({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}
function IconMenu({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}

function SidebarNav({
  showApproval,
  pendingApprovals,
  navClass,
  onNavigate,
}: {
  showApproval: boolean
  pendingApprovals: number
  navClass: ({ isActive }: { isActive: boolean }) => string
  onNavigate?: () => void
}) {
  return (
    <nav className="flex flex-1 flex-col gap-0.5 px-3">
      <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-ink-muted/70">
        워크스페이스
      </p>
      <NavLink to="/dashboard" className={navClass} onClick={onNavigate}>
        <IconHome /> 대시보드
      </NavLink>
      <NavLink to="/projects/new" className={navClass} onClick={onNavigate}>
        <IconPlus /> 새 프로젝트
      </NavLink>
      <NavLink to="/workspace/settings" className={navClass} onClick={onNavigate}>
        <IconUsers /> 멤버 · 설정
      </NavLink>
      {showApproval && (
        <NavLink to="/approval" className={navClass} onClick={onNavigate}>
          <IconCheck />
          <span className="flex-1">승인 센터</span>
          {pendingApprovals > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-[10px] font-semibold text-white">
              {pendingApprovals > 99 ? '99+' : pendingApprovals}
            </span>
          )}
        </NavLink>
      )}

      <div className="my-3 border-t border-border" />
      <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-ink-muted/70">
        계정
      </p>
      <NavLink to="/account" className={navClass} onClick={onNavigate}>
        <IconSettings /> 계정 설정
      </NavLink>
    </nav>
  )
}

export function AppLayout() {
  const { user, logout, init, loading } = useAuthStore()
  const { notifications, load, markRead, markAllRead, unreadCount } = useNotificationStore()
  const [notifOpen, setNotifOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    init()
  }, [init])

  useEffect(() => {
    if (user) load(user.id)
  }, [user, load])

  useEffect(() => {
    const onChanged = () => {
      useNotificationStore.getState().refreshSession()
    }
    window.addEventListener('approvalos:notifications-changed', onChanged)
    return () => window.removeEventListener('approvalos:notifications-changed', onChanged)
  }, [])

  useEffect(() => {
    setMenuOpen(false)
    setNotifOpen(false)
  }, [location.pathname])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    )
  }

  if (!user) {
    navigate('/login')
    return null
  }

  const workspace = user.workspace_id ? localApi.getWorkspace(user.workspace_id) : null
  const showApproval = user.role === 'approver' || user.role === 'admin'
  const unread = unreadCount()
  const pendingApprovals = showApproval ? localApi.getPendingApprovals(user.id).length : 0
  const projectCount = user.workspace_id ? localApi.getProjects(user.workspace_id).length : 0
  const planLimit = workspace?.plan === 'free' ? 5 : workspace?.plan === 'pro' ? 50 : 999
  const planRemain = Math.max(0, planLimit - projectCount)

  const projectMatch = location.pathname.match(/^\/projects\/([^/]+)/)
  const projectId = projectMatch?.[1]
  const onProjectPage = Boolean(projectId && projectId !== 'new')
  const topBarSection = onProjectPage
    ? getProjectPageLabel(location.pathname, projectId!)
    : location.pathname.startsWith('/approval')
      ? '승인 센터'
      : location.pathname.startsWith('/account')
        ? '계정 설정'
        : location.pathname.startsWith('/workspace')
          ? '멤버 · 설정'
          : location.pathname.startsWith('/projects/new')
            ? '새 프로젝트'
            : '대시보드'

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
      isActive
        ? 'bg-accent text-white shadow-sm'
        : 'text-ink-muted hover:bg-accent-soft hover:text-accent'
    }`

  const sidebarContent = (
    <>
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">
          A
        </div>
        <Link to="/dashboard" className="text-base font-bold tracking-tight text-ink" onClick={() => setMenuOpen(false)}>
          ApprovalOS
        </Link>
      </div>

      <SidebarNav
        showApproval={showApproval}
        pendingApprovals={pendingApprovals}
        navClass={navClass}
        onNavigate={() => setMenuOpen(false)}
      />

      <div className="mx-3 mb-3 rounded-xl border border-border bg-surface p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-ink">
            플랜: {(workspace?.plan ?? 'free').toUpperCase()}
          </p>
        </div>
        <p className="mt-2 text-[11px] text-ink-muted">남은 프로젝트</p>
        <div className="mt-1 flex items-center justify-between text-xs font-medium text-ink">
          <span>
            {planRemain}/{planLimit === 999 ? '∞' : planLimit}
          </span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{
              width: `${planLimit === 999 ? 8 : Math.min(100, (projectCount / planLimit) * 100)}%`,
            }}
          />
        </div>
        <button
          type="button"
          className="mt-3 w-full rounded-lg border border-border bg-surface-raised py-1.5 text-xs font-medium text-ink-muted hover:border-accent/30 hover:text-accent"
          onClick={() => {
            setMenuOpen(false)
            navigate('/workspace/settings')
          }}
        >
          플랜 관리
        </button>
      </div>

      <div className="border-t border-border p-3">
        <div className="mb-2 flex items-center gap-2 rounded-xl px-2 py-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white">
            {user.name.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink">{user.name}</p>
            <p className="truncate text-[11px] text-ink-muted">{workspace?.name ?? '워크스페이스'}</p>
          </div>
        </div>
        <button
          className="w-full rounded-lg px-3 py-2 text-left text-xs text-ink-muted hover:bg-danger-soft hover:text-danger"
          onClick={() => {
            logout()
            navigate('/login')
          }}
        >
          로그아웃
        </button>
      </div>
    </>
  )

  return (
    <div className="flex min-h-screen bg-surface">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-[220px] shrink-0 flex-col border-r border-border bg-surface-raised lg:flex">
        {sidebarContent}
      </aside>

      {/* Mobile drawer */}
      {menuOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-ink/40 lg:hidden"
            aria-label="메뉴 닫기"
            onClick={() => setMenuOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-[min(280px,85vw)] flex-col border-r border-border bg-surface-raised shadow-xl lg:hidden">
            {sidebarContent}
          </aside>
        </>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border bg-surface-raised/90 px-4 backdrop-blur sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <button
              type="button"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-ink-muted hover:bg-accent-soft hover:text-accent lg:hidden"
              aria-label="메뉴 열기"
              onClick={() => setMenuOpen(true)}
            >
              <IconMenu />
            </button>
            <div className="min-w-0 text-sm text-ink-muted lg:hidden">
              <span className="font-medium text-ink">ApprovalOS</span>
            </div>
            <div className="hidden min-w-0 text-sm text-ink-muted lg:block">
              {workspace ? (
                <>
                  <span className="font-medium text-ink">{workspace.name}</span>
                  <span className="mx-2 text-border">|</span>
                  <span>{topBarSection}</span>
                </>
              ) : (
                'ApprovalOS'
              )}
            </div>
          </div>
          <div className="relative shrink-0">
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative flex h-9 w-9 items-center justify-center rounded-xl text-ink-muted hover:bg-accent-soft hover:text-accent"
              aria-label="알림"
            >
              <IconBell />
              {unread > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] text-white">
                  {unread}
                </span>
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 mt-2 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-border bg-surface-raised shadow-[var(--shadow-card-hover)]">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <span className="font-semibold">알림</span>
                  <button className="text-xs font-medium text-accent" onClick={() => markAllRead(user.id)}>
                    모두 읽음
                  </button>
                </div>
                <div className="max-h-[min(18rem,50vh)] overflow-auto">
                  {notifications.length === 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-ink-muted">알림이 없습니다</p>
                  ) : (
                    notifications.slice(0, 20).map((n) => (
                      <button
                        key={n.id}
                        className={`block w-full border-b border-border px-4 py-3 text-left hover:bg-accent-soft/50 ${
                          !n.is_read ? 'bg-accent-soft/30' : ''
                        }`}
                        onClick={() => {
                          markRead(n.id)
                          setNotifOpen(false)
                          if (n.link) navigate(n.link)
                        }}
                      >
                        <p className="text-sm font-medium">{n.title}</p>
                        <p className="mt-0.5 text-xs text-ink-muted">{n.body}</p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </header>
        <main className="flex-1 pb-[env(safe-area-inset-bottom,0px)]">
          <Outlet />
        </main>
      </div>
      <ToastContainer />
    </div>
  )
}

export function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -20%, #dbeafe, transparent), radial-gradient(ellipse 50% 40% at 100% 100%, #eff6ff, transparent)',
        }}
      />
      <div className="relative z-10 w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-lg font-bold text-white">
            A
          </span>
          <span className="text-xl font-bold tracking-tight text-ink sm:text-2xl">ApprovalOS</span>
        </Link>
        <Outlet />
      </div>
      <ToastContainer />
    </div>
  )
}
