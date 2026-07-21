import { useMemo, useState } from 'react'
import { localApi } from '@/lib/localDb'
import { useAdminStore } from '@/stores/adminStore'
import { Button } from '@/components/common/Button'
import { Input, Select } from '@/components/common/Input'
import { toast } from '@/stores/toastStore'
import type { IncidentSeverity, IncidentStatus } from '@/types'

export function AdminIncidents() {
  const admin = useAdminStore((s) => s.admin)!
  const [tick, setTick] = useState(0)
  const list = useMemo(() => localApi.listIncidents(), [tick])
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [severity, setSeverity] = useState<IncidentSeverity>('warning')

  const refresh = () => setTick((t) => t + 1)

  return (
    <div>
      <h1 className="text-2xl font-semibold">점검 · 장애</h1>
      <p className="mt-1 text-sm text-ink-muted">상태 페이지용 인시던트 기록 (데모)</p>

      <section className="mt-6 max-w-xl space-y-3 rounded-xl border border-border bg-surface-raised p-5">
        <h2 className="font-medium">새 인시던트</h2>
        <Input label="제목" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Input label="요약" value={summary} onChange={(e) => setSummary(e.target.value)} />
        <Select
          label="심각도"
          value={severity}
          options={[
            { value: 'info', label: 'info' },
            { value: 'warning', label: 'warning' },
            { value: 'critical', label: 'critical' },
          ]}
          onChange={(e) => setSeverity(e.target.value as IncidentSeverity)}
        />
        <Button
          onClick={() => {
            if (!title.trim() || !summary.trim()) {
              toast.error('제목과 요약을 입력하세요')
              return
            }
            localApi.createIncident(
              { title: title.trim(), summary: summary.trim(), severity },
              admin.id
            )
            setTitle('')
            setSummary('')
            toast.success('등록됨')
            refresh()
          }}
        >
          등록
        </Button>
      </section>

      <ul className="mt-8 space-y-3">
        {list.map((inc) => (
          <li key={inc.id} className="rounded-xl border border-border bg-surface-raised p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium">{inc.title}</p>
                <p className="mt-1 text-sm text-ink-muted">{inc.summary}</p>
                <p className="mt-2 text-xs text-ink-muted">
                  {inc.severity} · {inc.status} · {new Date(inc.started_at).toLocaleString('ko-KR')}
                </p>
              </div>
              <Select
                value={inc.status}
                options={[
                  { value: 'investigating', label: 'investigating' },
                  { value: 'identified', label: 'identified' },
                  { value: 'monitoring', label: 'monitoring' },
                  { value: 'resolved', label: 'resolved' },
                ]}
                onChange={(e) => {
                  localApi.updateIncident(
                    inc.id,
                    { status: e.target.value as IncidentStatus },
                    admin.id
                  )
                  toast.success('상태 변경')
                  refresh()
                }}
              />
            </div>
          </li>
        ))}
        {list.length === 0 && <li className="text-sm text-ink-muted">인시던트 없음</li>}
      </ul>
    </div>
  )
}
