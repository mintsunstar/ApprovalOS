import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { localApi } from '@/lib/localDb'
import { useAdminStore } from '@/stores/adminStore'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { toast } from '@/stores/toastStore'

export function AdminDashboard() {
  const admin = useAdminStore((s) => s.admin)!
  const [tick, setTick] = useState(0)
  const stats = useMemo(() => localApi.getAdminDashboardStats(), [tick])
  const flags = useMemo(() => localApi.getSystemFlags(), [tick])
  const [msg, setMsg] = useState(flags.maintenance_message || '시스템 점검 중입니다.')

  const cards = [
    { label: '워크스페이스', value: stats.workspace_count, to: '/admin/workspaces' },
    { label: '사용자', value: stats.user_count, to: '/admin/users' },
    { label: '프로젝트', value: stats.project_count, to: '/admin/workspaces' },
    { label: '정지 WS', value: stats.suspended_workspaces, to: '/admin/workspaces' },
    { label: '정지 사용자', value: stats.suspended_users, to: '/admin/users' },
    { label: '열린 점검', value: stats.open_incidents, to: '/admin/incidents' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-semibold">대시보드</h1>
      <p className="mt-1 text-sm text-ink-muted">플랫폼 운영 현황 (로컬 데모 집계)</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.label}
            to={c.to}
            className="rounded-xl border border-border bg-surface-raised p-4 transition hover:border-accent/40"
          >
            <p className="text-xs text-ink-muted">{c.label}</p>
            <p className="mt-1 text-2xl font-semibold">{c.value}</p>
          </Link>
        ))}
      </div>

      <section className="mt-8 rounded-xl border border-border bg-surface-raised p-5">
        <h2 className="font-medium">점검 모드</h2>
        <p className="mt-1 text-sm text-ink-muted">
          켜면 일반 앱 상단에 배너가 표시됩니다. (TOTP·실차단은 Out of scope)
        </p>
        <div className="mt-3">
          <Input
            label="메시지"
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            onClick={() => {
              localApi.setMaintenance(true, msg.trim() || '시스템 점검 중입니다.', null, admin.id)
              toast.success('점검 모드 ON')
              setTick((t) => t + 1)
            }}
          >
            점검 시작
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              localApi.setMaintenance(false, '', null, admin.id)
              toast.success('점검 모드 OFF')
              setTick((t) => t + 1)
            }}
          >
            점검 종료
          </Button>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
              flags.maintenance ? 'bg-danger/15 text-danger' : 'bg-accent/15 text-accent'
            }`}
          >
            {flags.maintenance ? '점검 중' : '정상'}
          </span>
        </div>
      </section>
    </div>
  )
}
