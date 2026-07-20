import { Link } from 'react-router-dom'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import { StatusBadge } from '@/components/common/Badge'
import type { Project } from '@/types'

export function ProjectCard({ project }: { project: Project }) {
  const dday = differenceInCalendarDays(parseISO(project.deadline), new Date())
  const thumbs = (project.items ?? []).slice(0, 3)
  const cover = thumbs[0]?.current_version?.file_url

  return (
    <Link
      to={`/projects/${project.id}`}
      className="card card-hover group block overflow-hidden transition"
    >
      <div className="relative h-36 bg-surface">
        {cover ? (
          <img src={cover} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-accent-soft to-surface">
            <span className="text-sm font-medium text-accent">시안 없음</span>
          </div>
        )}
        <div className="absolute right-3 top-3">
          <StatusBadge status={project.status} />
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-ink group-hover:text-accent">{project.title}</h3>
        <div className="mt-2 flex items-center justify-between text-xs text-ink-muted">
          <span>참여자 {project.member_count ?? 0}명</span>
          <span className={dday <= 3 && dday >= 0 ? 'font-semibold text-danger' : ''}>
            {dday < 0 ? '마감됨' : `D-${dday}`}
          </span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${project.vote_rate ?? 0}%` }}
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between text-xs text-ink-muted">
          <span>투표율 {project.vote_rate ?? 0}%</span>
          {project.status === 'approval' && project.total_approval_steps ? (
            <span className="font-medium text-warning">
              승인 {project.current_approval_step}/{project.total_approval_steps}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  )
}
