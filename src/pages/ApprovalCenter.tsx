import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/common/Button'
import { Badge } from '@/components/common/Badge'
import { EmptyState } from '@/components/common/EmptyState'
import { Modal, ConfirmDialog } from '@/components/common/Modal'
import { Textarea } from '@/components/common/Input'
import { useAuthStore } from '@/stores/authStore'
import { localApi } from '@/lib/localDb'
import { toast } from '@/stores/toastStore'
import type { ApprovalLine, Project } from '@/types'

type Tab = 'pending' | 'done' | 'all'

export function ApprovalCenter() {
  const user = useAuthStore((s) => s.user)
  const [tab, setTab] = useState<Tab>('pending')
  const [pending, setPending] = useState<{ project: Project; line: ApprovalLine }[]>([])
  const [rejectTarget, setRejectTarget] = useState<{ project: Project; line: ApprovalLine } | null>(
    null
  )
  const [rejectReason, setRejectReason] = useState('')
  const [approveTarget, setApproveTarget] = useState<{
    project: Project
    line: ApprovalLine
  } | null>(null)
  const navigate = useNavigate()

  const refresh = () => {
    if (!user) return
    setPending(localApi.getPendingApprovals(user.id))
  }

  useEffect(() => {
    refresh()
  }, [user])

  if (!user) return null
  if (user.role !== 'approver' && user.role !== 'admin') {
    navigate('/dashboard')
    return null
  }

  const filtered = tab === 'pending' || tab === 'all' ? pending : []

  return (
    <div className="px-6 py-8 lg:px-8">
      <h1 className="mb-2 text-2xl font-bold">승인 센터</h1>
      <p className="mb-6 text-sm text-ink-muted">대기 중인 승인 요청을 확인하고 처리하세요</p>

      <div className="mb-6 flex w-fit gap-1 rounded-xl border border-border bg-surface-raised p-1">
        {(
          [
            ['pending', `대기 중 ${pending.length}`],
            ['done', '완료'],
            ['all', '전체'],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              tab === k ? 'bg-accent text-white shadow-sm' : 'text-ink-muted'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            title="현재 승인 요청이 없습니다"
            description="대기 중인 승인 요청이 없습니다"
          />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface text-xs uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">프로젝트</th>
                <th className="px-4 py-3 font-semibold">단계</th>
                <th className="px-4 py-3 font-semibold">요청일</th>
                <th className="px-4 py-3 font-semibold">기한</th>
                <th className="px-4 py-3 font-semibold">상태</th>
                <th className="px-4 py-3 font-semibold text-right">액션</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(({ project, line }) => {
                const workspace = localApi.getWorkspace(project.workspace_id)
                const dday = Math.ceil(
                  (new Date(line.deadline ?? project.deadline).getTime() - Date.now()) / 86400000
                )
                return (
                  <tr key={`${project.id}-${line.id}`} className="border-b border-border last:border-0">
                    <td className="px-4 py-4">
                      <p className="font-semibold text-ink">{project.title}</p>
                      <p className="text-xs text-ink-muted">{workspace?.name}</p>
                    </td>
                    <td className="px-4 py-4">
                      <Badge tone="warning">
                        {line.step_order}단계 {line.step_name}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 text-ink-muted">
                      {new Date(line.created_at).toLocaleDateString('ko-KR')}
                    </td>
                    <td className={`px-4 py-4 ${dday <= 3 ? 'font-semibold text-danger' : 'text-ink-muted'}`}>
                      D-{dday}
                    </td>
                    <td className="px-4 py-4">
                      <Badge tone="accent">대기</Badge>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => navigate(`/projects/${project.id}/approval/review`)}
                        >
                          상세
                        </Button>
                        <Button size="sm" onClick={() => setApproveTarget({ project, line })}>
                          검토
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => setRejectTarget({ project, line })}
                        >
                          반려
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={!!approveTarget}
        onClose={() => setApproveTarget(null)}
        title="빠른 승인"
        description="이 요청을 승인하시겠습니까?"
        confirmLabel="승인"
        onConfirm={() => {
          if (!approveTarget || !user) return
          try {
            localApi.submitApprovalAction({
              approval_line_id: approveTarget.line.id,
              user_id: user.id,
              action: 'approved',
              selected_item_id: null,
              reject_reason: null,
            })
            toast.success('승인되었습니다')
            setApproveTarget(null)
            refresh()
          } catch (err) {
            toast.error(err instanceof Error ? err.message : '실패')
          }
        }}
      />

      <Modal
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        title="반려 사유"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejectTarget(null)}>
              취소
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (!rejectTarget || !user) return
                if (rejectReason.trim().length < 10) {
                  toast.error('최소 10자 이상 입력해주세요')
                  return
                }
                try {
                  localApi.submitApprovalAction({
                    approval_line_id: rejectTarget.line.id,
                    user_id: user.id,
                    action: 'rejected',
                    selected_item_id: null,
                    reject_reason: rejectReason.trim(),
                  })
                  toast.success('반려되었습니다')
                  setRejectTarget(null)
                  setRejectReason('')
                  refresh()
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : '실패')
                }
              }}
            >
              반려 처리
            </Button>
          </>
        }
      >
        <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={4} />
      </Modal>
    </div>
  )
}
