import { NavLink } from 'react-router-dom'
import type { Project } from '@/types'
import { StatusBadge } from '@/components/common/Badge'

interface ProjectLNBProps {
  project: Project
  isAdmin?: boolean
}

const links = [
  { to: '', label: '시안 보기', end: true },
  { to: '/vote', label: '투표' },
  { to: '/comments', label: '댓글' },
  { to: '/analysis', label: 'AI 분석' },
  { to: '/report', label: '보고서' },
  { to: '/approval', label: '승인' },
]

/** Horizontal project tabs (mockup 2-1 style) */
export function ProjectLNB({ project, isAdmin }: ProjectLNBProps) {
  const base = `/projects/${project.id}`
  return (
    <div className="border-b border-border bg-surface-raised px-6">
      <nav className="-mb-px flex gap-1 overflow-x-auto">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={`${base}${link.to}`}
            end={link.end}
            className={({ isActive }) =>
              `whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition ${
                isActive
                  ? 'border-accent text-accent'
                  : 'border-transparent text-ink-muted hover:border-border hover:text-ink'
              }`
            }
          >
            {link.label}
            {link.label === '승인' && project.status === 'approval' && project.current_approval_step ? (
              <span className="ml-1 text-xs opacity-70">
                ({project.current_approval_step}/{project.total_approval_steps})
              </span>
            ) : null}
          </NavLink>
        ))}
        {isAdmin && (
          <NavLink
            to={`${base}/settings`}
            className={({ isActive }) =>
              `whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition ${
                isActive
                  ? 'border-accent text-accent'
                  : 'border-transparent text-ink-muted hover:border-border hover:text-ink'
              }`
            }
          >
            설정
          </NavLink>
        )}
      </nav>
    </div>
  )
}

interface ProjectHeaderProps {
  project: Project
  actions?: React.ReactNode
}

export function ProjectHeader({ project, actions }: ProjectHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-surface-raised px-6 py-5">
      <div className="flex items-start gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <h1 className="text-xl font-bold text-ink">{project.title}</h1>
            <StatusBadge status={project.status} />
          </div>
          {project.description && (
            <p className="text-sm text-ink-muted">{project.description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
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
  actions?: React.ReactNode
  children: React.ReactNode
  sidebar?: React.ReactNode
}) {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col">
      <ProjectHeader project={project} actions={actions} />
      <ProjectLNB project={project} isAdmin={isAdmin} />
      <div className="flex flex-1">
        <div className="min-w-0 flex-1 p-6">{children}</div>
        {sidebar}
      </div>
    </div>
  )
}
