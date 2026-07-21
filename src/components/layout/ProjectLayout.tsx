import { NavLink, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import type { Project } from '@/types'
import { StatusBadge } from '@/components/common/Badge'

interface ProjectLNBProps {
  project: Project
  isAdmin?: boolean
}

export const PROJECT_NAV_LINKS = [
  { to: '', label: '시안 보기', end: true },
  { to: '/vote', label: '투표' },
  { to: '/comments', label: '댓글' },
  { to: '/analysis', label: 'AI 분석' },
  { to: '/report', label: '보고서' },
  { to: '/approval', label: '승인' },
  { to: '/settings', label: '설정', adminOnly: true },
] as const

/** Resolve current project tab label from pathname */
export function getProjectPageLabel(pathname: string, projectId: string): string {
  const base = `/projects/${projectId}`
  if (!pathname.startsWith(base)) return '시안 보기'
  const rest = pathname.slice(base.length).split('?')[0]
  if (!rest || rest === '/') return '시안 보기'
  if (rest.startsWith('/vote')) return '투표'
  if (rest.startsWith('/comments')) return '댓글'
  if (rest.startsWith('/analysis')) return 'AI 분석'
  if (rest.startsWith('/report')) return '보고서'
  if (rest.startsWith('/approval')) return '승인'
  if (rest.startsWith('/settings')) return '설정'
  if (rest.startsWith('/items') || rest.startsWith('/compare')) return '시안 보기'
  return '시안 보기'
}

/** Horizontal project tabs (mockup 2-1 style) */
export function ProjectLNB({ project, isAdmin }: ProjectLNBProps) {
  const base = `/projects/${project.id}`
  const links = PROJECT_NAV_LINKS.filter((link) => !('adminOnly' in link && link.adminOnly) || isAdmin)

  return (
    <div className="border-b border-border bg-surface-raised px-4 sm:px-6">
      <nav className="-mb-px flex gap-1 overflow-x-auto scrollbar-none [-webkit-overflow-scrolling:touch]">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={`${base}${link.to}`}
            end={'end' in link ? link.end : false}
            className={({ isActive }) =>
              `whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition sm:px-4 sm:py-3 ${
                isActive
                  ? 'border-accent text-accent'
                  : 'border-transparent text-ink-muted hover:border-border hover:text-ink'
              }`
            }
          >
            {link.label}
            {link.label === '승인' &&
            project.status === 'approval' &&
            project.current_approval_step ? (
              <span className="ml-1 text-xs opacity-70">
                ({project.current_approval_step}/{project.total_approval_steps})
              </span>
            ) : null}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

interface ProjectHeaderProps {
  project: Project
  actions?: ReactNode
  /** Override auto title from route (e.g. nested review screens) */
  title?: string
  description?: string | null
}

export function ProjectHeader({ project, actions, title, description }: ProjectHeaderProps) {
  const location = useLocation()
  const pageTitle = title ?? getProjectPageLabel(location.pathname, project.id)
  const desc = description === undefined ? project.description : description

  return (
    <div className="flex flex-wrap items-start justify-between gap-3 bg-surface-raised px-4 py-4 sm:px-6 sm:py-5">
      <div className="min-w-0 flex-1">
        <p className="mb-1 truncate text-xs text-ink-muted sm:text-sm">{project.title}</p>
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-bold text-ink sm:text-xl">{pageTitle}</h1>
          <StatusBadge status={project.status} />
        </div>
        {desc && <p className="text-sm text-ink-muted">{desc}</p>}
      </div>
      {actions && <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">{actions}</div>}
    </div>
  )
}

/** Wrapper used by project pages: header + tabs + content */
export function ProjectShell({
  project,
  isAdmin,
  actions,
  children,
  sidebar,
}: {
  project: Project
  isAdmin?: boolean
  actions?: ReactNode
  children: ReactNode
  sidebar?: ReactNode
}) {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col">
      <ProjectHeader project={project} actions={actions} />
      <ProjectLNB project={project} isAdmin={isAdmin} />
      <div className="flex flex-1">
        <div className="min-w-0 flex-1 p-4 sm:p-6">{children}</div>
        {sidebar}
      </div>
    </div>
  )
}
