import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { localApi } from '@/lib/localDb'
import { useAdminStore } from '@/stores/adminStore'
import { Button } from '@/components/common/Button'
import { Select } from '@/components/common/Input'
import { toast } from '@/stores/toastStore'
import type { PlanType } from '@/types'

export function AdminWorkspaces() {
  const [q, setQ] = useState('')
  const [tick, setTick] = useState(0)
  const list = useMemo(() => localApi.listAdminWorkspaces(), [tick])
  const filtered = list.filter(
    (w) =>
      w.name.toLowerCase().includes(q.toLowerCase()) ||
      w.id.toLowerCase().includes(q.toLowerCase())
  )

  return (
    <div>
      <h1 className="text-2xl font-semibold">워크스페이스</h1>
      <input
        className="mt-4 w-full max-w-md rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        placeholder="이름·ID 검색"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="mt-4 overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-surface-raised text-ink-muted">
            <tr>
              <th className="px-4 py-3 font-medium">이름</th>
              <th className="px-4 py-3 font-medium">플랜</th>
              <th className="px-4 py-3 font-medium">상태</th>
              <th className="px-4 py-3 font-medium">멤버</th>
              <th className="px-4 py-3 font-medium">프로젝트</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((w) => (
              <tr key={w.id} className="border-t border-border hover:bg-surface-raised/60">
                <td className="px-4 py-3">
                  <Link to={`/admin/workspaces/${w.id}`} className="font-medium text-accent hover:underline">
                    {w.name}
                  </Link>
                </td>
                <td className="px-4 py-3 uppercase">{w.plan}</td>
                <td className="px-4 py-3">{w.status ?? 'active'}</td>
                <td className="px-4 py-3">{w.member_count}</td>
                <td className="px-4 py-3">{w.project_count}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-ink-muted">
                  결과 없음
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <button type="button" className="sr-only" onClick={() => setTick((t) => t + 1)} />
    </div>
  )
}

export function AdminWorkspaceDetail() {
  const { id = '' } = useParams()
  const admin = useAdminStore((s) => s.admin)!
  const [tick, setTick] = useState(0)
  const ws = useMemo(() => localApi.getAdminWorkspace(id), [id, tick])

  if (!ws) {
    return <p className="text-ink-muted">워크스페이스를 찾을 수 없습니다</p>
  }

  const refresh = () => setTick((t) => t + 1)

  return (
    <div>
      <Link to="/admin/workspaces" className="text-sm text-ink-muted hover:text-accent">
        ← 목록
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">{ws.name}</h1>
      <p className="mt-1 text-xs text-ink-muted">{ws.id}</p>

      <div className="mt-6 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface-raised p-5">
        <Select
          label="플랜"
          value={ws.plan}
          options={[
            { value: 'free', label: 'Free' },
            { value: 'pro', label: 'Pro' },
            { value: 'enterprise', label: 'Enterprise' },
          ]}
          onChange={(e) => {
            localApi.setWorkspacePlan(ws.id, e.target.value as PlanType, admin.id)
            toast.success('플랜 변경됨')
            refresh()
          }}
        />
        <div className="flex gap-2">
          {ws.status === 'suspended' ? (
            <Button
              onClick={() => {
                localApi.setWorkspaceStatus(ws.id, 'active', admin.id)
                toast.success('정지 해제')
                refresh()
              }}
            >
              정지 해제
            </Button>
          ) : (
            <Button
              variant="danger"
              onClick={() => {
                if (!confirm('이 워크스페이스를 정지할까요?')) return
                localApi.setWorkspaceStatus(ws.id, 'suspended', admin.id)
                toast.success('정지됨')
                refresh()
              }}
            >
              정지
            </Button>
          )}
        </div>
        <span className="text-sm text-ink-muted">상태: {ws.status ?? 'active'}</span>
      </div>

      <section className="mt-8">
        <h2 className="font-medium">멤버 ({ws.members.length})</h2>
        <ul className="mt-3 space-y-2">
          {ws.members.map((m) => (
            <li key={m.id} className="flex justify-between rounded-lg border border-border px-3 py-2 text-sm">
              <Link to={`/admin/users/${m.id}`} className="text-accent hover:underline">
                {m.name} ({m.email})
              </Link>
              <span className="text-ink-muted">{m.role}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="font-medium">프로젝트 ({ws.projects.length})</h2>
        <ul className="mt-3 space-y-2">
          {ws.projects.map((p) => (
            <li key={p.id} className="rounded-lg border border-border px-3 py-2 text-sm">
              {p.title} <span className="text-ink-muted">· {p.status}</span>
            </li>
          ))}
          {ws.projects.length === 0 && <li className="text-sm text-ink-muted">프로젝트 없음</li>}
        </ul>
      </section>
    </div>
  )
}
