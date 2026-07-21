import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/common/Button'
import { Modal, ConfirmDialog } from '@/components/common/Modal'
import { Textarea } from '@/components/common/Input'
import { Badge } from '@/components/common/Badge'
import { StoredImage } from '@/components/common/StoredImage'
import { ProjectLNB, ProjectHeader } from '@/components/layout/ProjectLayout'
import { useAuthStore } from '@/stores/authStore'
import { useProjectStore } from '@/stores/projectStore'
import { localApi } from '@/lib/localDb'
import { toast } from '@/stores/toastStore'
import type { ApprovalLine, ProjectStatus, VoteType } from '@/types'
import { STATUS_LABELS } from '@/types'

const VOTE_TYPE_LABELS: Record<VoteType, string> = {
  single: '단순 선택',
  rank: '순위 매기기',
  score: '항목별 점수',
  combined: '복합',
}

function approvalProjectStatus(status: ProjectStatus): string {
  if (status === 'closed') return '투표 완료'
  if (status === 'voting') return '투표 중'
  if (status === 'approval') return '승인 중'
  return STATUS_LABELS[status]
}

function lineStatusLabel(status: ApprovalLine['status'], started: boolean): string {
  if (status === 'completed') return '완료'
  if (status === 'active') return '진행 중'
  if (status === 'rejected') return '반려'
  return started ? '대기' : '대기 중'
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}. ${String(d.getMonth() + 1).padStart(2, '0')}. ${String(d.getDate()).padStart(2, '0')}.`
}

export function ProjectApproval() {
  const { id } = useParams<{ id: string }>()
  const user = useAuthStore((s) => s.user)
  const { currentProject, items, loadProject } = useProjectStore()
  const [lines, setLines] = useState<ApprovalLine[]>([])
  const navigate = useNavigate()

  const refresh = () => {
    if (!id) return
    loadProject(id)
    setLines(localApi.getApprovalLines(id))
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const history = useMemo(() => {
    return lines
      .flatMap((line) =>
        (line.actions ?? []).map((a) => ({
          id: a.id,
          at: a.created_at,
          name: line.approvers?.find((u) => u.id === a.user_id)?.name ?? '승인자',
          step: `${line.step_order}단계 ${line.step_name}`,
          action: a.action,
          reason: a.reject_reason,
        }))
      )
      .sort((a, b) => b.at.localeCompare(a.at))
  }, [lines])

  if (!currentProject || !user) return null
  const project = currentProject
  const isAdmin = user.role === 'admin' || user.id === project.created_by
  const rejectedLine = lines.find((l) => l.status === 'rejected')
  const activeLine = lines.find((l) => l.status === 'active')
  const approvalStarted = project.status === 'approval' || project.status === 'closed'
  const allCompleted =
    lines.length > 0 && lines.every((l) => l.status === 'completed') && !rejectedLine
  const canStart =
    isAdmin &&
    project.use_approval &&
    lines.length > 0 &&
    project.status !== 'approval' &&
    project.status !== 'closed' &&
    !rejectedLine
  const canApprove =
    activeLine &&
    activeLine.approver_ids.includes(user.id) &&
    !activeLine.actions?.some((a) => a.user_id === user.id)

  const startApproval = () => {
    if (!project.use_approval || lines.length === 0) {
      toast.error('승인 라인이 설정되지 않았습니다')
      return
    }
    localApi.startApproval(project.id)
    toast.success('승인이 시작되었습니다')
    refresh()
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col bg-surface">
      <ProjectHeader
        project={project}
        actions={
          <>
            {canStart && (
              <Button onClick={startApproval}>
                <IconPlay /> 승인 시작하기
              </Button>
            )}
            {canApprove && (
              <Button onClick={() => navigate(`/projects/${project.id}/approval/review`)}>
                승인 진행
              </Button>
            )}
            {isAdmin && rejectedLine && (
              <Button
                variant="secondary"
                onClick={() => {
                  localApi.restartApproval(project.id)
                  toast.success('재승인 요청이 시작되었습니다')
                  refresh()
                }}
              >
                재승인 요청
              </Button>
            )}
          </>
        }
      />
      <ProjectLNB project={project} isAdmin={isAdmin} />

      <div className="mx-auto w-full max-w-5xl space-y-4 p-4 sm:space-y-5 sm:p-6">
        {rejectedLine && (
          <div className="rounded-2xl border border-danger/30 bg-danger-soft p-5">
            <h3 className="font-bold text-danger">
              {rejectedLine.step_order}단계에서 반려되었습니다
            </h3>
            <p className="mt-2 text-sm text-ink">
              반려 사유:{' '}
              {rejectedLine.actions?.find((a) => a.action === 'rejected')?.reject_reason ?? '-'}
            </p>
          </div>
        )}

        {/* Timeline */}
        <section className="rounded-2xl border border-border bg-surface-raised p-5 shadow-[var(--shadow-card)] sm:p-6">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-ink">승인 타임라인</h2>
              <p className="mt-1 text-sm text-ink-muted">
                승인 라인을 설정하고 각 단계를 진행하세요.
              </p>
            </div>
            {isAdmin && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  toast.info('승인 라인은 프로젝트 생성 시 설정됩니다')
                  navigate(`/projects/${project.id}/settings`)
                }}
              >
                <IconGear /> 승인 라인 설정
              </Button>
            )}
          </div>

          {lines.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-surface px-4 py-10 text-center">
              <p className="text-sm font-medium text-ink">승인 라인이 없습니다</p>
              <p className="mt-1 text-sm text-ink-muted">
                프로젝트 생성 시 다단계 승인을 켜고 단계를 구성해 주세요.
              </p>
              {isAdmin && (
                <Button
                  className="mt-4"
                  size="sm"
                  variant="secondary"
                  onClick={() => navigate(`/projects/${project.id}/settings`)}
                >
                  설정으로 이동
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto pb-2">
              <ol className="flex min-w-[520px] items-start justify-between gap-0 px-2 sm:min-w-0">
                {lines.map((line, idx) => {
                  const names =
                    (line.approvers ?? [])
                      .map((a) => a.name)
                      .slice(0, 2)
                      .join(', ') || '미지정'
                  const initial = names.charAt(0)
                  const isActive = line.status === 'active'
                  const isDone = line.status === 'completed'
                  const isRejected = line.status === 'rejected'
                  const isFocus = isActive || (!approvalStarted && idx === 0) || isRejected

                  return (
                    <li key={line.id} className="relative flex flex-1 flex-col items-center">
                      {idx < lines.length && (
                        <div
                          className={`absolute left-[calc(50%+28px)] right-[calc(-50%+28px)] top-7 border-t-2 border-dashed ${
                            isDone || (idx === lines.length - 1 && (allCompleted || project.status === 'closed'))
                              ? 'border-emerald-300'
                              : isDone
                                ? 'border-accent/40'
                                : 'border-border'
                          }`}
                        />
                      )}
                      <div
                        className={`relative z-[1] flex h-14 w-14 items-center justify-center rounded-full border-2 ${
                          isRejected
                            ? 'border-danger bg-danger-soft text-danger'
                            : isDone
                              ? 'border-emerald-400 bg-emerald-50 text-emerald-600'
                              : isFocus
                                ? 'border-accent bg-accent-soft text-accent shadow-[0_0_0_4px_rgba(37,99,235,0.12)]'
                                : 'border-border bg-surface text-ink-muted'
                        }`}
                      >
                        {isDone ? (
                          <IconCheck />
                        ) : (
                          <span className="text-lg font-semibold">{initial}</span>
                        )}
                        <span
                          className={`absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white ${
                            isRejected ? 'bg-danger' : isFocus ? 'bg-accent' : 'bg-slate-400'
                          }`}
                        >
                          {line.step_order}
                        </span>
                      </div>
                      <p className="mt-3 text-center text-sm font-semibold text-ink">
                        {line.step_name}
                      </p>
                      <p
                        className={`mt-0.5 text-center text-xs ${
                          isRejected
                            ? 'text-danger'
                            : isActive
                              ? 'font-medium text-accent'
                              : 'text-ink-muted'
                        }`}
                      >
                        {lineStatusLabel(line.status, approvalStarted)}
                      </p>
                      <p className="mt-0.5 max-w-[7rem] truncate text-center text-xs text-ink-muted">
                        {names}
                      </p>
                    </li>
                  )
                })}

                {/* Final complete node */}
                <li className="relative flex w-[88px] shrink-0 flex-col items-center sm:w-auto sm:flex-1">
                  <div
                    className={`relative z-[1] flex h-14 w-14 items-center justify-center rounded-full border-2 ${
                      allCompleted || project.status === 'closed'
                        ? 'border-emerald-400 bg-emerald-50 text-emerald-600'
                        : 'border-border bg-surface text-ink-muted'
                    }`}
                  >
                    <IconCheck />
                  </div>
                  <p className="mt-3 text-center text-sm font-semibold text-ink">완료</p>
                  <p className="mt-0.5 text-center text-xs text-ink-muted">
                    {allCompleted || project.status === 'closed' ? '완료' : '대기'}
                  </p>
                </li>
              </ol>
            </div>
          )}
        </section>

        {/* History + Project info */}
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-border bg-surface-raised p-5 shadow-[var(--shadow-card)] sm:p-6">
            <h2 className="text-base font-bold text-ink">승인 이력</h2>
            <p className="mt-1 text-sm text-ink-muted">
              프로젝트의 승인 진행 내역을 확인하세요.
            </p>

            {history.length === 0 ? (
              <div className="mt-8 flex flex-col items-center justify-center gap-3 py-8 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-ink-muted">
                  <IconHistory />
                </div>
                <div>
                  <p className="text-sm font-medium text-ink">아직 승인 이력이 없습니다</p>
                  <p className="mt-1 text-sm text-ink-muted">
                    승인 요청이 시작되면 이력이 표시됩니다.
                  </p>
                </div>
              </div>
            ) : (
              <ul className="mt-5 space-y-3">
                {history.map((h) => (
                  <li
                    key={h.id}
                    className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-border bg-surface px-3 py-3 text-sm"
                  >
                    <div>
                      <p className="font-medium text-ink">
                        {h.name} · {h.step}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-muted">
                        {new Date(h.at).toLocaleString('ko-KR')}
                        {h.reason ? ` · ${h.reason}` : ''}
                      </p>
                    </div>
                    <Badge tone={h.action === 'approved' ? 'success' : 'danger'}>
                      {h.action === 'approved' ? '승인' : '반려'}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="flex flex-col rounded-2xl border border-border bg-surface-raised p-5 shadow-[var(--shadow-card)] sm:p-6">
            <h2 className="mb-4 text-base font-bold text-ink">프로젝트 정보</h2>
            <dl className="grid flex-1 grid-cols-2 gap-x-4 gap-y-4 text-sm">
              <div>
                <dt className="text-xs text-ink-muted">프로젝트명</dt>
                <dd className="mt-1 font-semibold text-ink">{project.title}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">투표 마감일</dt>
                <dd className="mt-1 font-semibold text-ink">{fmtDate(project.deadline)}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">참여자</dt>
                <dd className="mt-1 font-semibold text-ink">{project.member_count ?? 0}명</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">총 시안</dt>
                <dd className="mt-1 font-semibold text-ink">{items.length}개</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">투표 방식</dt>
                <dd className="mt-1 font-semibold text-ink">
                  {VOTE_TYPE_LABELS[project.vote_type]}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">현재 상태</dt>
                <dd className="mt-1 font-semibold text-accent">
                  {approvalProjectStatus(project.status)}
                </dd>
              </div>
            </dl>

            <div className="mt-5 flex items-start gap-2 rounded-xl border border-accent/20 bg-accent-soft/70 px-3 py-3 text-xs leading-relaxed text-accent sm:text-sm">
              <IconInfo className="mt-0.5 shrink-0" />
              <span>승인 요청을 시작하면 지정된 승인자에게 알림이 발송됩니다.</span>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function IconPlay() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7L8 5z" />
    </svg>
  )
}
function IconGear() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}
function IconCheck() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M5 13l4 4L19 7" />
    </svg>
  )
}
function IconHistory() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 8v4l3 2" />
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
    </svg>
  )
}
function IconInfo({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8h.01M11 12h1v5h1" />
    </svg>
  )
}

export function ApprovalReview() {
  const { id } = useParams<{ id: string }>()
  const user = useAuthStore((s) => s.user)
  const { currentProject, items, loadProject } = useProjectStore()
  const [lines, setLines] = useState<ApprovalLine[]>([])
  const [selectedItem, setSelectedItem] = useState<string | null>(null)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const analysis = id ? localApi.getAnalysis(id) : null

  useEffect(() => {
    if (id) {
      loadProject(id)
      setLines(localApi.getApprovalLines(id))
    }
  }, [id, loadProject])

  useEffect(() => {
    if (items.length && selectedItem === null) {
      const sorted = [...items].sort((a, b) => (b.vote_count ?? 0) - (a.vote_count ?? 0))
      if (sorted[0]) setSelectedItem(sorted[0].id)
    }
  }, [items, selectedItem])

  if (!currentProject || !user) return null
  const project = currentProject
  const activeLine = lines.find((l) => l.status === 'active')
  const sortedItems = [...items].sort((a, b) => (b.vote_count ?? 0) - (a.vote_count ?? 0))

  const approve = () => {
    if (!activeLine) return
    setLoading(true)
    try {
      localApi.submitApprovalAction({
        approval_line_id: activeLine.id,
        user_id: user.id,
        action: 'approved',
        selected_item_id: selectedItem,
        reject_reason: null,
      })
      toast.success('승인 처리되었습니다')
      navigate(`/projects/${project.id}/approval`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '승인 실패')
    } finally {
      setLoading(false)
      setConfirmOpen(false)
    }
  }

  const reject = () => {
    if (!activeLine) return
    if (rejectReason.trim().length < 10) {
      toast.error('반려 사유는 최소 10자 이상이어야 합니다')
      return
    }
    setLoading(true)
    try {
      localApi.submitApprovalAction({
        approval_line_id: activeLine.id,
        user_id: user.id,
        action: 'rejected',
        selected_item_id: null,
        reject_reason: rejectReason.trim(),
      })
      toast.success('반려 처리되었습니다')
      navigate(`/projects/${project.id}/approval`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '반려 실패')
    } finally {
      setLoading(false)
      setRejectOpen(false)
    }
  }

  const finalTitle = items.find((i) => i.id === selectedItem)?.title ?? '없음'

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col">
      <ProjectHeader project={project} />
      <ProjectLNB project={project} isAdmin={user.role === 'admin'} />
      <div className="mx-auto w-full max-w-3xl p-4 sm:p-6">
        <h2 className="mb-2 text-lg font-bold">
          {activeLine?.step_name ?? '승인'} 검토
        </h2>

        <section className="mt-6">
          <h3 className="mb-3 font-semibold">시안 목록 (투표 결과 순)</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            {sortedItems.map((item, i) => (
              <div key={item.id} className="card overflow-hidden">
                <div className="aspect-video bg-surface">
                  {item.current_version?.file_url && (
                    <StoredImage
                      fileRef={item.current_version.file_url}
                      alt=""
                      className="h-full w-full object-contain"
                    />
                  )}
                </div>
                <div className="p-3 text-sm">
                  <Badge tone="accent">{i + 1}위</Badge>
                  <p className="mt-1 font-semibold">{item.title}</p>
                  <p className="text-ink-muted">
                    {item.vote_count ?? 0}표 / {item.avg_score ?? 0}점
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="card mt-6 p-4">
          <h3 className="mb-2 font-semibold">투표 결과 요약</h3>
          {sortedItems.slice(0, 3).map((item, i) => (
            <p key={item.id} className="text-sm text-ink-muted">
              {i + 1}위: {item.title} ({item.vote_rate ?? 0}%)
            </p>
          ))}
        </section>

        {analysis && (
          <section className="card mt-4 border-accent/20 bg-accent-soft/40 p-4">
            <h3 className="mb-2 font-semibold">AI 분석 요약</h3>
            <p className="text-sm leading-relaxed text-ink-muted">{analysis.overall_summary}</p>
          </section>
        )}

        <section className="mt-6">
          <h3 className="mb-3 font-semibold">최종 시안 선택 (선택사항)</h3>
          <div className="flex flex-wrap gap-3">
            {sortedItems.map((item, i) => (
              <label key={item.id} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="final"
                  checked={selectedItem === item.id}
                  onChange={() => setSelectedItem(item.id)}
                />
                {item.title} {i === 0 ? '(권장)' : ''}
              </label>
            ))}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="final"
                checked={selectedItem === null}
                onChange={() => setSelectedItem(null)}
              />
              선택 안함
            </label>
          </div>
        </section>

        <div className="mt-8 flex justify-end gap-3">
          <Button variant="danger" onClick={() => setRejectOpen(true)}>
            반려
          </Button>
          <Button variant="success" onClick={() => setConfirmOpen(true)}>
            승인 완료
          </Button>
        </div>

        <Modal
          open={rejectOpen}
          onClose={() => setRejectOpen(false)}
          title="반려 사유 입력"
          footer={
            <>
              <Button variant="secondary" onClick={() => setRejectOpen(false)}>
                취소
              </Button>
              <Button variant="danger" loading={loading} onClick={reject}>
                반려 처리
              </Button>
            </>
          }
        >
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value.slice(0, 500))}
            rows={4}
            placeholder="수정이 필요한 내용을 구체적으로 입력해주세요. (최소 10자)"
          />
          <p className="mt-1 text-xs text-ink-muted">글자 수: {rejectReason.length}/500</p>
        </Modal>

        <ConfirmDialog
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          onConfirm={approve}
          title="승인하시겠습니까?"
          description={`최종 시안 선택: ${finalTitle}. 이 내용으로 승인하시겠습니까?`}
          confirmLabel="승인 완료"
          loading={loading}
        />
      </div>
    </div>
  )
}
