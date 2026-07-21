import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { localApi } from '@/lib/localDb'
import { useAdminStore } from '@/stores/adminStore'
import { Button } from '@/components/common/Button'
import { toast } from '@/stores/toastStore'

export function AdminUsers() {
  const [q, setQ] = useState('')
  const list = useMemo(() => localApi.listAdminUsers(), [])
  const filtered = list.filter(
    (u) =>
      u.name.toLowerCase().includes(q.toLowerCase()) ||
      u.email.toLowerCase().includes(q.toLowerCase())
  )

  return (
    <div>
      <h1 className="text-2xl font-semibold">사용자</h1>
      <input
        className="mt-4 w-full max-w-md rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        placeholder="이름·이메일 검색"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="mt-4 overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-surface-raised text-ink-muted">
            <tr>
              <th className="px-4 py-3 font-medium">이름</th>
              <th className="px-4 py-3 font-medium">이메일</th>
              <th className="px-4 py-3 font-medium">역할</th>
              <th className="px-4 py-3 font-medium">상태</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-t border-border hover:bg-surface-raised/60">
                <td className="px-4 py-3">
                  <Link to={`/admin/users/${u.id}`} className="font-medium text-accent hover:underline">
                    {u.name}
                  </Link>
                </td>
                <td className="px-4 py-3">{u.email}</td>
                <td className="px-4 py-3">{u.role}</td>
                <td className="px-4 py-3">{u.status ?? 'active'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function AdminUserDetail() {
  const { id = '' } = useParams()
  const admin = useAdminStore((s) => s.admin)!
  const navigate = useNavigate()
  const [tick, setTick] = useState(0)
  const user = useMemo(() => localApi.getAdminUser(id), [id, tick])
  const ws = user?.workspace_id ? localApi.getWorkspace(user.workspace_id) : null

  if (!user || user.status === 'deleted') {
    return <p className="text-ink-muted">사용자를 찾을 수 없습니다</p>
  }

  const refresh = () => setTick((t) => t + 1)

  return (
    <div>
      <Link to="/admin/users" className="text-sm text-ink-muted hover:text-accent">
        ← 목록
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">{user.name}</h1>
      <p className="mt-1 text-sm text-ink-muted">{user.email}</p>

      <dl className="mt-6 grid gap-3 rounded-xl border border-border bg-surface-raised p-5 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-ink-muted">역할 (WS)</dt>
          <dd className="font-medium">{user.role}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">상태</dt>
          <dd className="font-medium">{user.status ?? 'active'}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">워크스페이스</dt>
          <dd className="font-medium">
            {ws ? (
              <Link to={`/admin/workspaces/${ws.id}`} className="text-accent hover:underline">
                {ws.name}
              </Link>
            ) : (
              '—'
            )}
          </dd>
        </div>
        <div>
          <dt className="text-ink-muted">가입</dt>
          <dd className="font-medium">{new Date(user.created_at).toLocaleString('ko-KR')}</dd>
        </div>
      </dl>

      <div className="mt-6 flex flex-wrap gap-2">
        {user.status === 'suspended' ? (
          <Button
            onClick={() => {
              localApi.setUserStatus(user.id, 'active', admin.id)
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
              if (!confirm('이 사용자를 정지할까요?')) return
              localApi.setUserStatus(user.id, 'suspended', admin.id)
              toast.success('정지됨')
              refresh()
            }}
          >
            계정 정지
          </Button>
        )}
        <Button
          variant="secondary"
          onClick={() => {
            localApi.stubResetPassword(user.id, admin.id)
            toast.success('비밀번호 초기화 메일 발송(데모 stub)')
          }}
        >
          비밀번호 초기화
        </Button>
        <Button
          variant="danger"
          onClick={() => {
            if (!confirm('강제 탈퇴할까요? 되돌릴 수 없습니다(데모).')) return
            localApi.forceDeleteUser(user.id, admin.id)
            toast.success('강제 탈퇴 완료')
            navigate('/admin/users')
          }}
        >
          강제 탈퇴
        </Button>
      </div>
    </div>
  )
}
