import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { localApi } from '@/lib/localDb'
import { useAdminStore } from '@/stores/adminStore'
import { Button } from '@/components/common/Button'
import { Input, Select } from '@/components/common/Input'
import { toast } from '@/stores/toastStore'
import type { Notice, NoticeType } from '@/types'

export function AdminNotices() {
  const [tick, setTick] = useState(0)
  const list = useMemo(() => localApi.listNotices(), [tick])

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">공지</h1>
        <Link to="/admin/notices/new">
          <Button size="sm">새 공지</Button>
        </Link>
      </div>
      <ul className="mt-6 space-y-2">
        {list.map((n) => (
          <li key={n.id}>
            <Link
              to={`/admin/notices/${n.id}`}
              className="flex items-center justify-between rounded-xl border border-border bg-surface-raised px-4 py-3 text-sm hover:border-accent/40"
            >
              <span>
                <span className="font-medium">{n.title}</span>
                <span className="ml-2 text-ink-muted">
                  {n.type} · {n.status}
                </span>
              </span>
              <span className="text-xs text-ink-muted">
                {new Date(n.created_at).toLocaleDateString('ko-KR')}
              </span>
            </Link>
          </li>
        ))}
        {list.length === 0 && <li className="text-sm text-ink-muted">공지 없음</li>}
      </ul>
      <button type="button" className="sr-only" onClick={() => setTick((t) => t + 1)} />
    </div>
  )
}

function NoticeForm({ initial }: { initial?: Notice }) {
  const admin = useAdminStore((s) => s.admin)!
  const navigate = useNavigate()
  const [title, setTitle] = useState(initial?.title ?? '')
  const [body, setBody] = useState(initial?.body ?? '')
  const [type, setType] = useState<NoticeType>(initial?.type ?? 'banner')

  const save = (publish: boolean) => {
    if (!title.trim() || !body.trim()) {
      toast.error('제목과 본문을 입력하세요')
      return
    }
    if (initial) {
      localApi.updateNotice(
        initial.id,
        { title: title.trim(), body: body.trim(), type, status: publish ? 'published' : initial.status },
        admin.id
      )
      toast.success(publish ? '발행됨' : '저장됨')
      navigate('/admin/notices')
      return
    }
    const n = localApi.createNotice(
      { title: title.trim(), body: body.trim(), type },
      admin.id
    )
    if (publish) localApi.updateNotice(n.id, { status: 'published' }, admin.id)
    toast.success(publish ? '발행됨' : '초안 저장')
    navigate('/admin/notices')
  }

  return (
    <div className="max-w-xl space-y-4">
      <Input label="제목" value={title} onChange={(e) => setTitle(e.target.value)} />
      <label className="block text-sm">
        <span className="mb-1.5 block text-ink-muted">본문</span>
        <textarea
          className="min-h-28 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </label>
      <Select
        label="유형"
        value={type}
        options={[
          { value: 'banner', label: '배너 (앱 상단)' },
          { value: 'modal', label: '모달 (데모 저장만)' },
          { value: 'email', label: '이메일 (stub)' },
        ]}
        onChange={(e) => setType(e.target.value as NoticeType)}
      />
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => save(false)}>초안 저장</Button>
        <Button onClick={() => save(true)}>발행</Button>
        {initial && initial.status === 'published' && (
          <Button
            variant="secondary"
            onClick={() => {
              localApi.updateNotice(initial.id, { status: 'archived' }, admin.id)
              toast.success('보관됨')
              navigate('/admin/notices')
            }}
          >
            보관
          </Button>
        )}
      </div>
    </div>
  )
}

export function AdminNoticeNew() {
  return (
    <div>
      <Link to="/admin/notices" className="text-sm text-ink-muted hover:text-accent">
        ← 목록
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">새 공지</h1>
      <div className="mt-6">
        <NoticeForm />
      </div>
    </div>
  )
}

export function AdminNoticeDetail() {
  const { id = '' } = useParams()
  const notice = localApi.getNotice(id)
  if (!notice) return <p className="text-ink-muted">공지를 찾을 수 없습니다</p>
  return (
    <div>
      <Link to="/admin/notices" className="text-sm text-ink-muted hover:text-accent">
        ← 목록
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">공지 편집</h1>
      <div className="mt-6">
        <NoticeForm initial={notice} />
      </div>
    </div>
  )
}
