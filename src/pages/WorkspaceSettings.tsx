import { useState } from 'react'
import { Button } from '@/components/common/Button'
import { Input, Select } from '@/components/common/Input'
import { ConfirmDialog } from '@/components/common/Modal'
import { useAuthStore } from '@/stores/authStore'
import { localApi } from '@/lib/localDb'
import { toast } from '@/stores/toastStore'
import type { UserRole } from '@/types'
import { ROLE_LABELS } from '@/types'

export function WorkspaceSettings() {
  const { user, refreshUser } = useAuthStore()
  const workspace = user?.workspace_id ? localApi.getWorkspace(user.workspace_id) : null
  const [name, setName] = useState(workspace?.name ?? '')
  const [members, setMembers] = useState(() =>
    user?.workspace_id ? localApi.getWorkspaceMembers(user.workspace_id) : []
  )
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteName, setDeleteName] = useState('')

  if (!user || !workspace) return null
  if (user.role !== 'admin') {
    return (
      <div className="p-8 text-center text-ink-muted">관리자만 접근할 수 있습니다</div>
    )
  }

  const refreshMembers = () => {
    setMembers(localApi.getWorkspaceMembers(workspace.id))
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-8 text-2xl font-semibold">워크스페이스 설정</h1>

      <section className="mb-8 rounded-xl border border-border bg-surface-raised p-5">
        <h2 className="mb-4 font-medium">기본 정보</h2>
        <Input label="워크스페이스명" value={name} onChange={(e) => setName(e.target.value)} />
        <Button
          className="mt-3"
          onClick={() => {
            localApi.updateWorkspace(workspace.id, { name: name.trim() })
            toast.success('저장되었습니다')
            refreshUser()
          }}
        >
          저장
        </Button>
      </section>

      <section className="mb-8 rounded-xl border border-border bg-surface-raised p-5">
        <h2 className="mb-4 font-medium">멤버 관리</h2>
        <div className="mb-4 flex items-center gap-2">
          <code className="flex-1 rounded bg-surface px-3 py-2 text-sm">
            {workspace.invite_token}
          </code>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              navigator.clipboard.writeText(
                `${window.location.origin}/invite/${workspace.invite_token}`
              )
              toast.success('복사됨')
            }}
          >
            초대 링크 복사
          </Button>
        </div>
        <ul className="space-y-3">
          {members.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs text-white">
                {m.name.charAt(0)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{m.name}</p>
                <p className="text-xs text-ink-muted">{m.email}</p>
              </div>
              <Select
                value={m.role}
                onChange={(e) => {
                  const newRole = e.target.value as UserRole
                  const admins = members.filter((x) => x.role === 'admin')
                  if (m.role === 'admin' && newRole !== 'admin' && admins.length <= 1) {
                    toast.error('최소 1명의 관리자가 필요합니다')
                    return
                  }
                  localApi.updateUser(m.id, { role: newRole })
                  refreshMembers()
                  toast.success('권한이 변경되었습니다')
                }}
                options={(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => ({
                  value: r,
                  label: ROLE_LABELS[r],
                }))}
                className="w-28"
              />
              <Button
                size="sm"
                variant="ghost"
                disabled={m.id === user.id}
                onClick={() => {
                  if (m.id === user.id) {
                    toast.error('본인은 삭제할 수 없습니다')
                    return
                  }
                  const admins = members.filter((x) => x.role === 'admin')
                  if (m.role === 'admin' && admins.length <= 1) {
                    toast.error('최소 1명의 관리자가 필요합니다')
                    return
                  }
                  if (confirm(`${m.name}님을 삭제하시겠습니까?`)) {
                    localApi.updateUser(m.id, { workspace_id: null })
                    refreshMembers()
                    toast.success('삭제되었습니다')
                  }
                }}
              >
                삭제
              </Button>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-8 rounded-xl border border-border bg-surface-raised p-5">
        <h2 className="mb-2 font-medium">플랜 현황</h2>
        <p className="text-sm">
          현재 플랜: <strong>{workspace.plan.toUpperCase()}</strong>
        </p>
        <p className="mt-1 text-sm text-ink-muted">
          멤버: {members.length}/∞ · 프로젝트: {localApi.getProjects(workspace.id).length}/∞
        </p>
        <p className="mt-3 text-xs text-ink-muted">결제 연동은 후속 버전에서 제공됩니다.</p>
      </section>

      <button className="text-sm text-danger hover:underline" onClick={() => setDeleteOpen(true)}>
        워크스페이스 삭제
      </button>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="워크스페이스를 삭제하시겠습니까?"
        description={`모든 프로젝트, 시안, 댓글이 삭제됩니다. "${workspace.name}"을(를) 입력하여 확인해주세요.`}
        confirmLabel="영구 삭제"
        danger
        onConfirm={() => {
          if (deleteName !== workspace.name) {
            toast.error('워크스페이스명을 정확히 입력해주세요')
            return
          }
          toast.success('삭제 요청이 접수되었습니다 (데모)')
          setDeleteOpen(false)
        }}
      />
      {deleteOpen && (
        <div className="fixed bottom-24 left-1/2 z-[60] w-80 -translate-x-1/2">
          <Input value={deleteName} onChange={(e) => setDeleteName(e.target.value)} />
        </div>
      )}
    </div>
  )
}
