import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/common/Button'
import { Input, Select } from '@/components/common/Input'
import { ConfirmDialog } from '@/components/common/Modal'
import { ProjectLNB } from '@/components/layout/ProjectLayout'
import { useAuthStore } from '@/stores/authStore'
import { useProjectStore } from '@/stores/projectStore'
import { localApi } from '@/lib/localDb'
import { toast } from '@/stores/toastStore'
import type { ApprovalLine, VoteType } from '@/types'

type SettingsTab =
  | 'info'
  | 'deadline'
  | 'vote'
  | 'visibility'
  | 'approval'
  | 'notify'
  | 'advanced'

const TABS: { id: SettingsTab; label: string }[] = [
  { id: 'info', label: '프로젝트 정보' },
  { id: 'deadline', label: '마감일' },
  { id: 'vote', label: '투표 방식' },
  { id: 'visibility', label: '공개 범위' },
  { id: 'approval', label: '승인 라인' },
  { id: 'notify', label: '알림 설정' },
  { id: 'advanced', label: '고급 설정' },
]

const VOTE_OPTIONS: { value: VoteType; label: string }[] = [
  { value: 'single', label: '단일 선택' },
  { value: 'rank', label: '순위 매기기' },
  { value: 'score', label: '항목별 점수' },
  { value: 'combined', label: '복합 (다수 선택 + 의견)' },
]

const TAGS_KEY = (projectId: string) => `approvalos_project_tags_${projectId}`

function loadTags(projectId: string): string[] {
  try {
    const raw = localStorage.getItem(TAGS_KEY(projectId))
    if (raw) return JSON.parse(raw) as string[]
  } catch {
    /* ignore */
  }
  return []
}

function saveTags(projectId: string, tags: string[]) {
  localStorage.setItem(TAGS_KEY(projectId), JSON.stringify(tags))
}

export function ProjectSettings() {
  const { id } = useParams<{ id: string }>()
  const user = useAuthStore((s) => s.user)
  const { currentProject, loadProject } = useProjectStore()
  const navigate = useNavigate()

  const [tab, setTab] = useState<SettingsTab>('info')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [deadline, setDeadline] = useState('')
  const [voteType, setVoteType] = useState<VoteType>('combined')
  const [visibility, setVisibility] = useState<'internal' | 'link'>('internal')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [lines, setLines] = useState<ApprovalLine[]>([])
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [dirty, setDirty] = useState(false)

  const workspace = user?.workspace_id ? localApi.getWorkspace(user.workspace_id) : null

  useEffect(() => {
    if (id) {
      loadProject(id)
      setLines(localApi.getApprovalLines(id))
    }
  }, [id, loadProject])

  useEffect(() => {
    if (!currentProject) return
    setTitle(currentProject.title)
    setDescription(currentProject.description ?? '')
    setDeadline(currentProject.deadline.slice(0, 10))
    setVoteType(currentProject.vote_type)
    setVisibility(currentProject.visibility)
    setTags(loadTags(currentProject.id))
    setDirty(false)
  }, [currentProject])

  const markDirty = () => setDirty(true)

  const publicUrl =
    visibility === 'link'
      ? `${window.location.origin}/vote/${currentProject?.public_token ?? '(저장 후 생성)'}`
      : null

  if (!currentProject || !user) return null
  if (user.role !== 'admin' && user.id !== currentProject.created_by) {
    navigate(`/projects/${id}`)
    return null
  }

  const project = currentProject

  const addTag = () => {
    const t = tagInput.trim()
    if (!t) return
    if (tags.includes(t)) {
      setTagInput('')
      return
    }
    if (tags.length >= 10) {
      toast.warning('태그는 최대 10개까지 추가할 수 있습니다')
      return
    }
    setTags([...tags, t])
    setTagInput('')
    markDirty()
  }

  const save = () => {
    if (title.trim().length < 1) {
      toast.error('프로젝트명을 입력해주세요')
      setTab('info')
      return
    }
    if (!deadline) {
      toast.error('마감일을 선택해주세요')
      setTab('deadline')
      return
    }
    localApi.updateProject(project.id, {
      title: title.trim().slice(0, 100),
      description: description.trim().slice(0, 300) || null,
      deadline: new Date(deadline).toISOString(),
      vote_type: voteType,
      visibility,
      public_token:
        visibility === 'link'
          ? project.public_token ?? crypto.randomUUID().slice(0, 12)
          : null,
    })
    saveTags(project.id, tags)
    toast.success('저장되었습니다')
    setDirty(false)
    loadProject(project.id)
    setLines(localApi.getApprovalLines(project.id))
  }

  const cancel = () => {
    if (dirty && !confirm('저장하지 않은 변경이 있습니다. 취소할까요?')) return
    navigate(`/projects/${project.id}`)
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col bg-surface">
      <ProjectLNB project={project} isAdmin />

      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Header */}
        <header className="mb-5 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <nav className="mb-2 flex flex-wrap items-center gap-1.5 text-xs text-ink-muted sm:text-sm">
              <span>{workspace?.name ?? '워크스페이스'}</span>
              <span className="text-border">›</span>
              <span>디자인 리뷰</span>
              <span className="text-border">›</span>
              <Link to={`/projects/${project.id}`} className="text-accent hover:underline">
                {project.title}
              </Link>
            </nav>
            <h1 className="text-2xl font-bold tracking-tight text-ink">설정</h1>
            <p className="mt-1 text-sm text-ink-muted">
              프로젝트 기본 정보를 설정하고 관리하세요.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={cancel}>
              취소
            </Button>
            <Button onClick={save}>
              <IconCheck /> 저장
            </Button>
          </div>
        </header>

        {/* Tabs */}
        <div className="mb-5 overflow-x-auto border-b border-border scrollbar-none">
          <nav className="flex min-w-max gap-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition sm:px-4 ${
                  tab === t.id
                    ? 'border-accent text-accent'
                    : 'border-transparent text-ink-muted hover:text-ink'
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab panels */}
        {(tab === 'info' || tab === 'deadline' || tab === 'vote' || tab === 'visibility') && (
          <section className="mb-5 rounded-2xl border border-border bg-surface-raised p-5 shadow-[var(--shadow-card)] sm:p-6">
            <div className="mb-5 flex items-start gap-2">
              <span className="mt-0.5 text-accent">
                <IconShield />
              </span>
              <div>
                <h2 className="text-base font-bold text-ink">프로젝트 정보</h2>
                <p className="mt-0.5 text-sm text-ink-muted">
                  프로젝트의 기본 정보를 입력하세요.
                </p>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Left */}
              <div className="space-y-4">
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-sm font-medium text-ink">프로젝트명</label>
                    <span className="text-xs text-ink-muted">{title.length} / 100</span>
                  </div>
                  <input
                    className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                    value={title}
                    maxLength={100}
                    onChange={(e) => {
                      setTitle(e.target.value)
                      markDirty()
                    }}
                  />
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-sm font-medium text-ink">프로젝트 설명 (선택)</label>
                    <span className="text-xs text-ink-muted">{description.length} / 300</span>
                  </div>
                  <textarea
                    rows={4}
                    maxLength={300}
                    placeholder="프로젝트에 대한 간단한 설명을 입력하세요."
                    className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value)
                      markDirty()
                    }}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink">
                    프로젝트 태그 (선택)
                  </label>
                  <input
                    className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                    placeholder="태그를 입력하고 Enter를 눌러 추가하세요."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addTag()
                      }
                    }}
                  />
                  <p className="mt-1 text-xs text-ink-muted">
                    로컬 데모용 태그입니다. (서버 DB 필드 없음)
                  </p>
                  {tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {tags.map((t) => (
                        <span
                          key={t}
                          className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent"
                        >
                          {t}
                          <button
                            type="button"
                            className="rounded-full hover:bg-accent/10"
                            aria-label={`${t} 삭제`}
                            onClick={() => {
                              setTags(tags.filter((x) => x !== t))
                              markDirty()
                            }}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right */}
              <div className="space-y-4">
                <Input
                  label="마감일"
                  type="date"
                  value={deadline}
                  onChange={(e) => {
                    setDeadline(e.target.value)
                    markDirty()
                  }}
                />
                <Select
                  label="투표 방식"
                  value={voteType}
                  onChange={(e) => {
                    setVoteType(e.target.value as VoteType)
                    markDirty()
                  }}
                  options={VOTE_OPTIONS}
                />
                <Select
                  label="공개 범위"
                  value={visibility}
                  onChange={(e) => {
                    setVisibility(e.target.value as 'internal' | 'link')
                    markDirty()
                  }}
                  options={[
                    { value: 'internal', label: '내부만' },
                    { value: 'link', label: '링크 공개' },
                  ]}
                />

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink">
                    프로젝트 대표 이미지 (선택)
                  </label>
                  <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface px-4 py-8 text-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-ink-muted">
                      <IconUpload />
                    </div>
                    <p className="text-sm font-medium text-ink-muted">이미지 업로드</p>
                    <p className="text-xs text-ink-muted">PNG, JPG 파일 (최대 5MB)</p>
                    <p className="text-[11px] text-ink-muted">데모에서는 아직 지원하지 않습니다</p>
                  </div>
                </div>

                {visibility === 'link' && (
                  <div className="rounded-xl border border-accent/20 bg-accent-soft/60 p-3 text-sm">
                    <p className="mb-2 font-medium text-ink">공개 투표 링크</p>
                    <code className="break-all text-xs text-accent">{publicUrl}</code>
                    {project.public_token && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="mt-2"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            `${window.location.origin}/vote/${project.public_token}`
                          )
                          toast.success('복사됨')
                        }}
                      >
                        복사
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {tab === 'approval' && (
          <section className="mb-5 rounded-2xl border border-border bg-surface-raised p-5 shadow-[var(--shadow-card)] sm:p-6">
            <h2 className="text-base font-bold text-ink">승인 라인</h2>
            <p className="mt-1 text-sm text-ink-muted">
              승인 단계는 프로젝트 생성 시 설정됩니다. (데모)
            </p>
            {lines.length === 0 ? (
              <div className="mt-6 rounded-xl border border-dashed border-border bg-surface px-4 py-10 text-center">
                <p className="text-sm font-medium text-ink">설정된 승인 라인이 없습니다</p>
                <p className="mt-1 text-sm text-ink-muted">
                  새 프로젝트 생성 시 &quot;다단계 승인&quot;을 켜고 단계를 구성해 주세요.
                </p>
              </div>
            ) : (
              <ol className="mt-5 space-y-3">
                {lines.map((line) => (
                  <li
                    key={line.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm"
                  >
                    <div>
                      <p className="font-semibold text-ink">
                        {line.step_order}. {line.step_name}
                      </p>
                      <p className="text-xs text-ink-muted">
                        {(line.approvers ?? []).map((a) => a.name).join(', ') || '승인자 미지정'}
                        {' · '}
                        {line.approval_type === 'all' ? '전원 승인' : '과반수'}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-ink-muted">
                      {line.status}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        )}

        {tab === 'notify' && (
          <section className="mb-5 rounded-2xl border border-border bg-surface-raised p-5 shadow-[var(--shadow-card)] sm:p-6">
            <h2 className="text-base font-bold text-ink">알림 설정</h2>
            <p className="mt-1 text-sm text-ink-muted">
              알림 수신 여부는 계정 단위로 설정됩니다.
            </p>
            <div className="mt-5 rounded-xl border border-accent/20 bg-accent-soft/50 px-4 py-4 text-sm text-ink">
              승인 요청·댓글·결과 공개 등 알림 토글은{' '}
              <Link to="/account" className="font-medium text-accent hover:underline">
                계정 설정
              </Link>
              에서 변경할 수 있습니다.
            </div>
          </section>
        )}

        {tab === 'advanced' && (
          <section className="mb-5 rounded-2xl border border-border bg-surface-raised p-5 shadow-[var(--shadow-card)] sm:p-6">
            <h2 className="text-base font-bold text-ink">고급 설정</h2>
            <p className="mt-1 text-sm text-ink-muted">프로젝트 상태와 공개 링크를 관리합니다.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {project.status !== 'closed' ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (confirm('프로젝트를 마감하시겠습니까?')) {
                      localApi.updateProject(project.id, { status: 'closed' })
                      toast.success('마감되었습니다')
                      loadProject(project.id)
                    }
                  }}
                >
                  지금 마감
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  onClick={() => {
                    localApi.updateProject(project.id, { status: 'active' })
                    toast.success('다시 열었습니다')
                    loadProject(project.id)
                  }}
                >
                  다시 열기
                </Button>
              )}
            </div>
          </section>
        )}

        {/* Project management / delete — always visible like mockup */}
        <section className="rounded-2xl border border-border bg-surface-raised p-5 shadow-[var(--shadow-card)] sm:p-6">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-ink">프로젝트 관리</h2>
              <p className="mt-0.5 text-sm text-ink-muted">
                프로젝트를 관리하거나 삭제할 수 있습니다.
              </p>
            </div>
            <Button variant="danger" onClick={() => setDeleteOpen(true)}>
              <IconTrash /> 프로젝트 삭제
            </Button>
          </div>
          <div className="flex items-start gap-2 rounded-xl border border-danger/20 bg-danger-soft/80 px-3 py-3 text-xs leading-relaxed text-danger sm:text-sm">
            <IconWarn className="mt-0.5 shrink-0" />
            <span>
              프로젝트를 삭제하면 모든 시안, 댓글, 투표, 분석 데이터가 영구적으로 삭제되며 복구할 수
              없습니다.
            </span>
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="프로젝트 삭제"
        description="시안, 투표, 댓글이 모두 삭제됩니다. 이 작업은 되돌릴 수 없습니다."
        confirmLabel="삭제"
        danger
        onConfirm={() => {
          localApi.deleteProject(project.id)
          toast.success('삭제되었습니다')
          navigate('/dashboard')
        }}
      />
    </div>
  )
}

function IconCheck() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M5 13l4 4L19 7" />
    </svg>
  )
}
function IconShield() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3l8 3v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-3z" />
    </svg>
  )
}
function IconUpload() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 16V6M8 9l4-4 4 4" />
      <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </svg>
  )
}
function IconTrash() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
    </svg>
  )
}
function IconWarn({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 9v4M12 17h.01" />
      <path d="M10.3 4.3 2.5 18a2 2 0 0 0 1.7 3h16a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0z" />
    </svg>
  )
}
