import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/common/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { ProjectCard } from '@/components/project/ProjectCard'
import { useAuthStore } from '@/stores/authStore'
import { useProjectStore } from '@/stores/projectStore'
import type { ProjectStatus } from '@/types'

type Filter = 'all' | 'active' | 'approval' | 'closed'

export function Dashboard() {
  const user = useAuthStore((s) => s.user)
  const { projects, loadProjects, loading } = useProjectStore()
  const [filter, setFilter] = useState<Filter>('all')
  const navigate = useNavigate()

  useEffect(() => {
    if (user?.workspace_id) loadProjects(user.workspace_id)
  }, [user, loadProjects])

  const stats = useMemo(() => {
    const count = (statuses: ProjectStatus[]) =>
      projects.filter((p) => statuses.includes(p.status)).length
    return [
      {
        label: '진행 중',
        value: count(['active', 'draft']),
        tone: 'bg-accent-soft text-accent',
        icon: '📁',
      },
      {
        label: '투표 중',
        value: count(['voting']),
        tone: 'bg-info-soft text-info',
        icon: '🗳',
      },
      {
        label: '승인 대기',
        value: count(['approval']),
        tone: 'bg-warning-soft text-warning',
        icon: '⏳',
      },
      {
        label: '완료',
        value: count(['closed']),
        tone: 'bg-success-soft text-success',
        icon: '✅',
      },
    ]
  }, [projects])

  const filtered = useMemo(() => {
    if (filter === 'all') return projects
    if (filter === 'active')
      return projects.filter((p) => p.status === 'active' || p.status === 'voting' || p.status === 'draft')
    return projects.filter((p) => p.status === filter)
  }, [projects, filter])

  const tabs: { key: Filter; label: string }[] = [
    { key: 'all', label: '전체' },
    { key: 'active', label: '진행 중' },
    { key: 'approval', label: '승인 중' },
    { key: 'closed', label: '완료' },
  ]

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
            안녕하세요, {user?.name ?? '사용자'}님
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            오늘도 디자인 리뷰와 승인을 한곳에서 관리하세요
          </p>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => navigate('/projects/new')}>
          + 새 프로젝트
        </Button>
      </div>

      {/* Stat cards — mockup 1-1 */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card flex items-center gap-4 p-5">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-lg ${s.tone}`}>
              {s.icon}
            </div>
            <div>
              <p className="text-xs font-medium text-ink-muted">{s.label}</p>
              <p className="text-2xl font-bold tabular-nums text-ink">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <h2 className="text-lg font-bold text-ink">최근 프로젝트</h2>
        <div className="scrollbar-none flex gap-1 overflow-x-auto rounded-xl border border-border bg-surface-raised p-1 [-webkit-overflow-scrolling:touch]">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                filter === t.key ? 'bg-accent text-white shadow-sm' : 'text-ink-muted hover:text-ink'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-56 animate-pulse rounded-xl bg-border/40" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            title="프로젝트가 없습니다"
            description="첫 번째 리뷰 프로젝트를 만들어보세요"
            actionLabel="새 프로젝트"
            onAction={() => navigate('/projects/new')}
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}
    </div>
  )
}
