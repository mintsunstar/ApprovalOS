import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/common/Button'
import { Input, Textarea, Select } from '@/components/common/Input'
import { useAuthStore } from '@/stores/authStore'
import { toast } from '@/stores/toastStore'
import { localApi } from '@/lib/localDb'
import type { ApprovalType, UserRole, VoteType } from '@/types'
import { ROLE_LABELS } from '@/types'

interface ApprovalStepDraft {
  step_name: string
  approver_ids: string[]
  approval_type: ApprovalType
}

export function ProjectNew() {
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [deadline, setDeadline] = useState('')
  const [visibility, setVisibility] = useState<'internal' | 'link'>('internal')
  const [voteType, setVoteType] = useState<VoteType>('combined')
  const [useApproval, setUseApproval] = useState(false)
  const [approvalSteps, setApprovalSteps] = useState<ApprovalStepDraft[]>([
    { step_name: '팀장 승인', approver_ids: [], approval_type: 'all' },
  ])
  const [inviteEmails, setInviteEmails] = useState('')
  const [inviteRole, setInviteRole] = useState<UserRole>('reviewer')

  const members = user?.workspace_id ? localApi.getWorkspaceMembers(user.workspace_id) : []

  const canNext = () => {
    if (step === 1) {
      if (!title.trim()) return false
      if (!deadline) return false
      if (new Date(deadline) < new Date(new Date().toDateString())) return false
      return true
    }
    if (step === 3 && useApproval) {
      return approvalSteps.every((s) => s.step_name && s.approver_ids.length > 0)
    }
    return true
  }

  const handleCreate = async (asDraft: boolean) => {
    if (!user?.workspace_id) return
    if (!canNext() && step === 1) {
      toast.error('필수 항목을 입력해주세요')
      return
    }
    if (new Date(deadline) < new Date(new Date().toDateString())) {
      toast.error('오늘 이후 날짜를 선택해주세요')
      return
    }
    if (useApproval && approvalSteps.some((s) => s.approver_ids.length === 0)) {
      toast.error('승인자를 지정해주세요')
      return
    }

    setLoading(true)
    try {
      const project = localApi.createProject({
        workspace_id: user.workspace_id,
        title: title.trim(),
        description: description.trim() || null,
        status: asDraft ? 'draft' : 'active',
        vote_type: voteType,
        deadline: new Date(deadline).toISOString(),
        visibility,
        use_approval: useApproval,
        created_by: user.id,
      })

      if (useApproval) {
        localApi.setApprovalLines(
          project.id,
          approvalSteps.map((s, i) => ({
            step_order: i + 1,
            step_name: s.step_name,
            approver_ids: s.approver_ids,
            approval_type: s.approval_type,
            deadline: null,
          }))
        )
      }

      const emails = inviteEmails
        .split(/[,;\s]+/)
        .map((e) => e.trim())
        .filter(Boolean)
      for (const email of emails) {
        localApi.createInvitation({
          project_id: project.id,
          workspace_id: user.workspace_id,
          email,
          role: inviteRole,
          invited_by: user.id,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
      }

      toast.success(asDraft ? '임시저장되었습니다' : '프로젝트가 생성되었습니다')
      navigate(`/projects/${project.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '생성 실패')
    } finally {
      setLoading(false)
    }
  }

  const totalSteps = useApproval ? 4 : 3

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-semibold">새 프로젝트</h1>
      <p className="mb-8 text-sm text-ink-muted">Step {step} / {totalSteps}</p>

      <div className="mb-8 flex gap-2">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full ${s <= step ? 'bg-accent' : 'bg-border'}`}
          />
        ))}
      </div>

      <div className="rounded-xl border border-border bg-surface-raised p-6">
        {step === 1 && (
          <div className="flex flex-col gap-4">
            <Input
              label="프로젝트명 *"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 50))}
              placeholder="예: Bluedigm CI 디자인 검토"
            />
            <Textarea
              label="설명"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
            <Input
              label="마감일 *"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
            <div>
              <p className="mb-2 text-sm font-medium">공개 범위 *</p>
              <div className="flex gap-4">
                {(['internal', 'link'] as const).map((v) => (
                  <label key={v} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      checked={visibility === v}
                      onChange={() => setVisibility(v)}
                    />
                    {v === 'internal' ? '내부만' : '링크 공유'}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-3">
            <p className="mb-2 text-sm font-medium">투표 방식</p>
            {(
              [
                ['single', '단일 선택'],
                ['rank', '순위 매기기'],
                ['score', '항목별 점수'],
                ['combined', '복합'],
              ] as const
            ).map(([value, label]) => (
              <label
                key={value}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 ${
                  voteType === value ? 'border-accent bg-accent-soft' : 'border-border'
                }`}
              >
                <input
                  type="radio"
                  checked={voteType === value}
                  onChange={() => setVoteType(value)}
                />
                <span className="text-sm font-medium">{label}</span>
              </label>
            ))}
          </div>
        )}

        {step === 3 && useApproval === false && totalSteps === 3 ? (
          <InviteSection
            inviteEmails={inviteEmails}
            setInviteEmails={setInviteEmails}
            inviteRole={inviteRole}
            setInviteRole={setInviteRole}
          />
        ) : null}

        {step === 3 && (useApproval || totalSteps === 4) && (
          <div className="flex flex-col gap-4">
            <label className="flex items-center justify-between">
              <span className="text-sm font-medium">승인 라인 사용</span>
              <input
                type="checkbox"
                checked={useApproval}
                onChange={(e) => setUseApproval(e.target.checked)}
                className="h-4 w-4"
              />
            </label>
            {useApproval && (
              <>
                {approvalSteps.map((s, idx) => (
                  <div key={idx} className="rounded-lg border border-border p-4">
                    <Input
                      label={`단계 ${idx + 1} 이름`}
                      value={s.step_name}
                      onChange={(e) => {
                        const next = [...approvalSteps]
                        next[idx] = { ...next[idx], step_name: e.target.value }
                        setApprovalSteps(next)
                      }}
                    />
                    <div className="mt-3">
                      <p className="mb-2 text-sm font-medium">승인자</p>
                      <div className="flex flex-wrap gap-2">
                        {members.map((m) => (
                          <label
                            key={m.id}
                            className={`cursor-pointer rounded-full border px-3 py-1 text-xs ${
                              s.approver_ids.includes(m.id)
                                ? 'border-accent bg-accent-soft text-accent'
                                : 'border-border'
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={s.approver_ids.includes(m.id)}
                              onChange={() => {
                                const next = [...approvalSteps]
                                const ids = s.approver_ids.includes(m.id)
                                  ? s.approver_ids.filter((id) => id !== m.id)
                                  : [...s.approver_ids, m.id]
                                next[idx] = { ...next[idx], approver_ids: ids }
                                setApprovalSteps(next)
                              }}
                            />
                            {m.name}
                          </label>
                        ))}
                        {members.length === 0 && (
                          <p className="text-xs text-ink-muted">본인을 승인자로 지정할 수 있습니다</p>
                        )}
                        {user && !members.some((m) => m.id === user.id) === false && (
                          <label
                            className={`cursor-pointer rounded-full border px-3 py-1 text-xs ${
                              s.approver_ids.includes(user.id)
                                ? 'border-accent bg-accent-soft text-accent'
                                : 'border-border'
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={s.approver_ids.includes(user.id)}
                              onChange={() => {
                                const next = [...approvalSteps]
                                const ids = s.approver_ids.includes(user.id)
                                  ? s.approver_ids.filter((id) => id !== user.id)
                                  : [...s.approver_ids, user.id]
                                next[idx] = { ...next[idx], approver_ids: ids }
                                setApprovalSteps(next)
                              }}
                            />
                            {user.name} (나)
                          </label>
                        )}
                      </div>
                    </div>
                    <div className="mt-3">
                      <Select
                        label="승인 방식"
                        value={s.approval_type}
                        onChange={(e) => {
                          const next = [...approvalSteps]
                          next[idx] = {
                            ...next[idx],
                            approval_type: e.target.value as ApprovalType,
                          }
                          setApprovalSteps(next)
                        }}
                        options={[
                          { value: 'all', label: '전원 승인' },
                          { value: 'majority', label: '과반수 승인' },
                        ]}
                      />
                    </div>
                  </div>
                ))}
                {approvalSteps.length < 5 && (
                  <Button
                    variant="secondary"
                    onClick={() =>
                      setApprovalSteps([
                        ...approvalSteps,
                        {
                          step_name: `${approvalSteps.length + 1}단계 승인`,
                          approver_ids: [],
                          approval_type: 'all',
                        },
                      ])
                    }
                  >
                    + 단계 추가
                  </Button>
                )}
              </>
            )}
            {!useApproval && (
              <p className="text-sm text-ink-muted">승인을 사용하지 않으면 투표 마감 후 바로 종료됩니다.</p>
            )}
          </div>
        )}

        {step === 4 && (
          <InviteSection
            inviteEmails={inviteEmails}
            setInviteEmails={setInviteEmails}
            inviteRole={inviteRole}
            setInviteRole={setInviteRole}
          />
        )}

        {/* When approval toggle is on step 2 path adjustment */}
        {step === 2 && (
          <label className="mt-6 flex items-center justify-between border-t border-border pt-4">
            <span className="text-sm font-medium">승인 라인 사용 (다음 단계에서 설정)</span>
            <input
              type="checkbox"
              checked={useApproval}
              onChange={(e) => setUseApproval(e.target.checked)}
              className="h-4 w-4"
            />
          </label>
        )}
      </div>

      <div className="mt-6 flex justify-between">
        <Button variant="secondary" onClick={() => (step > 1 ? setStep(step - 1) : navigate(-1))}>
          {step > 1 ? '이전' : '취소'}
        </Button>
        <div className="flex gap-2">
          {step === totalSteps && (
            <Button variant="secondary" loading={loading} onClick={() => handleCreate(true)}>
              임시저장
            </Button>
          )}
          {step < totalSteps ? (
            <Button
              disabled={!canNext()}
              onClick={() => {
                if (step === 1 && !canNext()) {
                  toast.error('필수 항목을 확인해주세요')
                  return
                }
                setStep(step + 1)
              }}
            >
              다음
            </Button>
          ) : (
            <Button loading={loading} onClick={() => handleCreate(false)}>
              생성하기
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function InviteSection({
  inviteEmails,
  setInviteEmails,
  inviteRole,
  setInviteRole,
}: {
  inviteEmails: string
  setInviteEmails: (v: string) => void
  inviteRole: UserRole
  setInviteRole: (v: UserRole) => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <Textarea
        label="참여자 이메일 (쉼표로 구분)"
        value={inviteEmails}
        onChange={(e) => setInviteEmails(e.target.value)}
        placeholder="member@company.com, ..."
        rows={3}
      />
      <Select
        label="권한"
        value={inviteRole}
        onChange={(e) => setInviteRole(e.target.value as UserRole)}
        options={(Object.keys(ROLE_LABELS) as UserRole[])
          .filter((r) => r !== 'admin')
          .map((r) => ({ value: r, label: ROLE_LABELS[r] }))}
      />
    </div>
  )
}
