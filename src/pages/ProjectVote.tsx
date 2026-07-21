import { useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/common/Button'
import { Textarea } from '@/components/common/Input'
import { StoredImage } from '@/components/common/StoredImage'
import { ProjectLNB, ProjectHeader } from '@/components/layout/ProjectLayout'
import { useAuthStore } from '@/stores/authStore'
import { useProjectStore } from '@/stores/projectStore'
import { localApi } from '@/lib/localDb'
import { toast } from '@/stores/toastStore'
import { SCORE_CRITERIA, type DesignItem, type User, type VoteType } from '@/types'

const STEPS = [
  { id: 1, label: '시안 선택', desc: '투표할 시안을 고르세요' },
  { id: 2, label: '투표하기', desc: '순위 또는 점수를 선택하세요' },
  { id: 3, label: '확인 및 제출', desc: '최종 확인 후 제출하세요' },
  { id: 4, label: '완료', desc: '제출이 완료되었습니다' },
] as const

function fmtDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}. ${String(d.getMonth() + 1).padStart(2, '0')}. ${String(d.getDate()).padStart(2, '0')}.`
}

function fmtDeadline(iso: string): string {
  const d = new Date(iso)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${fmtDate(iso)} ${hh}:${mm}`
}

function letterLabel(index: number): string {
  return `${String.fromCharCode(65 + (index % 26))}안`
}

function needsSelectStep(voteType: VoteType): boolean {
  return voteType === 'single' || voteType === 'combined'
}

function needsRankStep(voteType: VoteType): boolean {
  return voteType === 'rank' || voteType === 'combined'
}

function needsScoreStep(voteType: VoteType): boolean {
  return voteType === 'score' || voteType === 'combined'
}

export function ProjectVote() {
  const { id } = useParams<{ id: string }>()
  const user = useAuthStore((s) => s.user)
  const { currentProject, items, loadProject } = useProjectStore()
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
  const [selected, setSelected] = useState<string[]>([])
  const [rankings, setRankings] = useState<string[]>([])
  const [scores, setScores] = useState<Record<string, Record<string, number>>>({})
  const [comment, setComment] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)
  const [memberMap, setMemberMap] = useState<Record<string, User>>({})
  const [voteCount, setVoteCount] = useState(0)
  const [alreadyVoted, setAlreadyVoted] = useState(false)

  useEffect(() => {
    if (id) loadProject(id)
  }, [id, loadProject])

  useEffect(() => {
    if (!currentProject || !user) return
    const members = localApi.getWorkspaceMembers(currentProject.workspace_id)
    const map: Record<string, User> = {}
    for (const m of members) map[m.id] = m
    setMemberMap(map)

    const votes = localApi.getVotes(currentProject.id)
    setVoteCount(votes.length)
    const mine = votes.find((v) => v.user_id === user.id)
    if (mine) {
      setAlreadyVoted(true)
      setDone(true)
      setSelected(mine.selected_item_ids)
      setRankings(mine.rankings.length ? mine.rankings : mine.selected_item_ids)
      setScores(mine.scores)
      setComment(mine.comment ?? '')
    }
  }, [currentProject, user])

  useEffect(() => {
    if (items.length && rankings.length === 0) {
      setRankings(items.map((i) => i.id))
    }
  }, [items, rankings.length])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setRankings((list) => {
      const oldIndex = list.indexOf(String(active.id))
      const newIndex = list.indexOf(String(over.id))
      return arrayMove(list, oldIndex, newIndex)
    })
  }

  if (!currentProject || !user) return null
  const project = currentProject
  const isClosed = project.status === 'closed'
  const voteType = project.vote_type
  const isAdmin = user.role === 'admin' || user.id === project.created_by
  const maxSelect = Math.max(1, items.length)
  const minSelect = 1
  const visualStep = done || alreadyVoted ? 4 : step

  const toggleSelect = (itemId: string) => {
    if (alreadyVoted) return
    if (voteType === 'single') {
      setSelected([itemId])
      return
    }
    setSelected((prev) => {
      if (prev.includes(itemId)) return prev.filter((x) => x !== itemId)
      if (prev.length >= maxSelect) {
        toast.error(`최대 ${maxSelect}개까지 선택할 수 있습니다`)
        return prev
      }
      return [...prev, itemId]
    })
  }

  const rankedIds = useMemo(() => {
    if (voteType === 'combined') return rankings.filter((r) => selected.includes(r))
    if (voteType === 'rank') return rankings
    return selected
  }, [voteType, rankings, selected])

  const scoredItems = useMemo(() => {
    if (voteType === 'combined') return items.filter((i) => selected.includes(i.id))
    if (voteType === 'score') return items
    return []
  }, [voteType, items, selected])

  const goNext = () => {
    if (step === 1 && needsSelectStep(voteType) && selected.length < minSelect) {
      toast.error('시안을 선택해주세요')
      return
    }
    if (step === 1 && !needsSelectStep(voteType)) {
      setSelected(items.map((i) => i.id))
    }
    if (step === 2 && needsRankStep(voteType) && rankedIds.length === 0) {
      toast.error('순위를 정해주세요')
      return
    }
    setStep((s) => Math.min(3, s + 1))
  }

  const submit = () => {
    if (alreadyVoted) {
      toast.error('이미 제출한 투표입니다')
      return
    }
    setLoading(true)
    try {
      let selectedIds = selected
      let ranks = rankings
      let sc = scores

      if (voteType === 'single') {
        ranks = []
        sc = {}
      } else if (voteType === 'rank') {
        selectedIds = rankings
        sc = {}
      } else if (voteType === 'score') {
        selectedIds = items.map((i) => i.id)
        ranks = []
      } else {
        if (selected.length === 0) {
          toast.error('시안을 선택해주세요')
          setLoading(false)
          return
        }
        ranks = rankings.filter((r) => selected.includes(r))
      }

      localApi.upsertVote({
        project_id: project.id,
        user_id: user.id,
        guest_name: null,
        selected_item_ids: selectedIds,
        rankings: ranks,
        scores: sc,
        comment: comment.trim() || null,
      })

      if (project.status === 'active') {
        localApi.updateProject(project.id, { status: 'voting' })
        loadProject(project.id)
      }

      setVoteCount((n) => n + (alreadyVoted ? 0 : 1))
      setAlreadyVoted(true)
      setDone(true)
      toast.success('투표가 완료되었습니다')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '투표 실패')
    } finally {
      setLoading(false)
    }
  }

  const shell = (body: ReactNode) => (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col bg-surface">
      <ProjectHeader project={project} />
      <ProjectLNB project={project} isAdmin={isAdmin} />
      {body}
    </div>
  )

  if (isClosed && !done) {
    return shell(
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="rounded-2xl border border-border bg-surface-raised px-8 py-10 text-center shadow-[var(--shadow-card)]">
          <p className="text-lg font-semibold text-ink">투표가 마감되었습니다</p>
          <p className="mt-2 text-sm text-ink-muted">마감일 {fmtDeadline(project.deadline)}</p>
          <Button className="mt-6" variant="secondary" onClick={() => navigate(`/projects/${project.id}/report`)}>
            보고서 보기
          </Button>
        </div>
      </div>
    )
  }

  return shell(
    <div className="mx-auto grid w-full max-w-6xl gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="min-w-0 space-y-4">
        <Stepper visualStep={visualStep} />

        <section className="rounded-2xl border border-border bg-surface-raised p-4 shadow-[var(--shadow-card)] sm:p-5">
          {done || alreadyVoted ? (
            <DonePanel
              projectId={project.id}
              selected={selected}
              items={items}
              comment={comment}
              onHome={() => navigate(`/projects/${project.id}`)}
            />
          ) : (
            <>
              {step === 1 && (
                <SelectStep
                  items={items}
                  selected={selected}
                  voteType={voteType}
                  memberMap={memberMap}
                  deadline={project.deadline}
                  minSelect={minSelect}
                  maxSelect={maxSelect}
                  onToggle={toggleSelect}
                />
              )}

              {step === 2 && (
                <VoteStep
                  voteType={voteType}
                  items={items}
                  rankedIds={rankedIds}
                  scoredItems={scoredItems}
                  scores={scores}
                  sensors={sensors}
                  onDragEnd={onDragEnd}
                  setRankings={setRankings}
                  rankings={rankings}
                  selected={selected}
                  setScores={setScores}
                />
              )}

              {step === 3 && (
                <ConfirmStep
                  items={items}
                  selected={selected}
                  rankedIds={rankedIds}
                  scoredItems={scoredItems}
                  scores={scores}
                  voteType={voteType}
                  comment={comment}
                  setComment={setComment}
                />
              )}
            </>
          )}
        </section>

        {!done && !alreadyVoted && (
          <div className="flex justify-between gap-3">
            <Button variant="secondary" disabled={step === 1} onClick={() => setStep(step - 1)}>
              이전
            </Button>
            {step < 3 ? (
              <Button onClick={goNext}>다음</Button>
            ) : (
              <Button loading={loading} onClick={submit}>
                제출하기
              </Button>
            )}
          </div>
        )}
      </div>

      <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <section className="rounded-2xl border border-border bg-surface-raised p-4 shadow-[var(--shadow-card)]">
          <h2 className="mb-3 text-sm font-bold text-ink">투표 진행 정보</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex items-start justify-between gap-2">
              <dt className="text-ink-muted">투표 마감일</dt>
              <dd className="text-right font-medium text-ink">{fmtDeadline(project.deadline)}</dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-ink-muted">총 참여자</dt>
              <dd className="font-medium text-ink">{voteCount}명</dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-ink-muted">내 상태</dt>
              <dd>
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    done || alreadyVoted
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {done || alreadyVoted ? '제출 완료' : '미제출'}
                </span>
              </dd>
            </div>
          </dl>
          <div className="mt-4 rounded-xl bg-accent-soft/60 px-3 py-2.5 text-xs leading-relaxed text-accent">
            제출 후에는 투표를 수정할 수 없습니다.
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface-raised p-4 shadow-[var(--shadow-card)]">
          <h2 className="mb-3 text-sm font-bold text-ink">투표 가이드</h2>
          <ol className="space-y-3 text-sm text-ink-muted">
            <li className="flex gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
                1
              </span>
              <span>시안 정보와 키워드를 꼼꼼히 확인하세요.</span>
            </li>
            <li className="flex gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
                2
              </span>
              <span>선택한 시안에 대해 다음 단계에서 순위 또는 점수를 매깁니다.</span>
            </li>
          </ol>
        </section>

        <section className="rounded-2xl border border-border bg-surface-raised p-4 shadow-[var(--shadow-card)]">
          <p className="text-sm font-medium text-ink">도움이 필요하신가요?</p>
          <p className="mt-1 text-xs text-ink-muted">투표 방식과 마감 정책은 프로젝트 설정을 참고하세요.</p>
          {isAdmin && (
            <button
              type="button"
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
              onClick={() => navigate(`/projects/${project.id}/settings`)}
            >
              설정 자세히 보기
              <IconExternal />
            </button>
          )}
        </section>
      </aside>
    </div>
  )
}

function Stepper({ visualStep }: { visualStep: number }) {
  return (
    <ol className="grid grid-cols-2 gap-3 rounded-2xl border border-border bg-surface-raised p-4 shadow-[var(--shadow-card)] sm:grid-cols-4 sm:gap-2 sm:p-5">
      {STEPS.map((s, idx) => {
        const active = visualStep === s.id
        const done = visualStep > s.id
        return (
          <li key={s.id} className="relative flex items-start gap-2.5 sm:flex-col sm:items-center sm:text-center">
            {idx < STEPS.length - 1 && (
              <span
                className={`absolute top-4 left-8 hidden h-px sm:block sm:w-[calc(100%+0.5rem)] sm:translate-x-1/2 ${
                  done ? 'bg-accent' : 'bg-border'
                }`}
                aria-hidden
              />
            )}
            <span
              className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                active
                  ? 'bg-accent text-white'
                  : done
                    ? 'bg-accent/15 text-accent'
                    : 'bg-slate-100 text-ink-muted'
              }`}
            >
              {done ? '✓' : s.id}
            </span>
            <div className="min-w-0 sm:mt-2">
              <p className={`text-sm font-semibold ${active ? 'text-ink' : 'text-ink-muted'}`}>
                {s.label}
              </p>
              <p className="mt-0.5 hidden text-[11px] text-ink-muted lg:block">{s.desc}</p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

function SelectStep({
  items,
  selected,
  voteType,
  memberMap,
  deadline,
  minSelect,
  maxSelect,
  onToggle,
}: {
  items: DesignItem[]
  selected: string[]
  voteType: VoteType
  memberMap: Record<string, User>
  deadline: string
  minSelect: number
  maxSelect: number
  onToggle: (id: string) => void
}) {
  const selectMode = needsSelectStep(voteType)

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-ink">
            1. {selectMode ? '투표할 시안을 선택해주세요' : '시안을 확인해주세요'}
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            {selectMode
              ? '시안을 선택하면 다음 단계로 진행할 수 있습니다. (복수 선택 가능)'
              : '다음 단계에서 모든 시안에 대해 평가합니다.'}
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-1.5 text-xs text-ink-muted">
          <IconCalendar />
          투표 마감일 {fmtDeadline(deadline)}
        </div>
      </div>

      {items.length === 0 ? (
        <p className="py-10 text-center text-sm text-ink-muted">등록된 시안이 없습니다</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((item, idx) => {
            const checked = selectMode ? selected.includes(item.id) : true
            const author = memberMap[item.created_by]?.name ?? '등록자'
            return (
              <button
                key={item.id}
                type="button"
                disabled={!selectMode}
                onClick={() => selectMode && onToggle(item.id)}
                className={`overflow-hidden rounded-2xl border text-left transition ${
                  checked
                    ? 'border-accent ring-2 ring-accent/20'
                    : 'border-border hover:border-accent/40'
                } ${selectMode ? 'cursor-pointer' : 'cursor-default'}`}
              >
                <div className="aspect-[16/10] bg-surface">
                  {item.current_version?.file_url ? (
                    <StoredImage
                      fileRef={item.current_version.file_url}
                      alt=""
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-ink-muted">
                      이미지 없음
                    </div>
                  )}
                </div>
                <div className="space-y-2 p-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded border ${
                        checked
                          ? 'border-accent bg-accent text-white'
                          : 'border-border bg-surface-raised'
                      }`}
                    >
                      {checked && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path
                            d="M2.5 6.2L4.8 8.5L9.5 3.5"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </span>
                    <span className="text-sm font-bold text-ink">
                      {item.title || letterLabel(idx)}
                    </span>
                  </div>
                  {item.description && (
                    <p className="line-clamp-2 text-sm leading-relaxed text-ink-muted">
                      {item.description}
                    </p>
                  )}
                  {item.keywords?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {item.keywords.map((kw) => (
                        <span
                          key={kw}
                          className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-medium text-ink-muted"
                        >
                          #{kw.replace(/^#/, '')}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-[11px] text-ink-muted">
                    등록자 {author} | 등록일 {fmtDate(item.created_at)}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {selectMode && (
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-accent-soft/50 px-3.5 py-3 text-sm text-accent">
          <span className="mt-0.5 shrink-0">
            <IconInfo />
          </span>
          <span>
            최소 {minSelect}개, 최대 {maxSelect}개까지 선택할 수 있습니다.
          </span>
        </div>
      )}
    </div>
  )
}

function VoteStep({
  voteType,
  items,
  rankedIds,
  scoredItems,
  scores,
  sensors,
  onDragEnd,
  setRankings,
  rankings,
  selected,
  setScores,
}: {
  voteType: VoteType
  items: DesignItem[]
  rankedIds: string[]
  scoredItems: DesignItem[]
  scores: Record<string, Record<string, number>>
  sensors: ReturnType<typeof useSensors>
  onDragEnd: (e: DragEndEvent) => void
  setRankings: (v: string[] | ((prev: string[]) => string[])) => void
  rankings: string[]
  selected: string[]
  setScores: Dispatch<SetStateAction<Record<string, Record<string, number>>>>
}) {
  if (voteType === 'single') {
    const item = items.find((i) => i.id === selected[0])
    return (
      <div>
        <h2 className="mb-1 text-lg font-bold text-ink">2. 선택한 시안을 확인해주세요</h2>
        <p className="mb-4 text-sm text-ink-muted">다음 단계에서 의견을 남기고 제출할 수 있습니다.</p>
        {item ? (
          <div className="flex items-center gap-4 rounded-xl border border-border bg-surface p-3">
            <div className="h-16 w-24 overflow-hidden rounded-lg bg-surface-raised">
              {item.current_version?.file_url && (
                <StoredImage
                  fileRef={item.current_version.file_url}
                  alt=""
                  className="h-full w-full object-contain"
                />
              )}
            </div>
            <p className="font-semibold text-ink">{item.title}</p>
          </div>
        ) : (
          <p className="text-sm text-ink-muted">선택된 시안이 없습니다. 이전 단계로 돌아가세요.</p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="mb-1 text-lg font-bold text-ink">2. 투표하기</h2>
        <p className="text-sm text-ink-muted">
          {needsRankStep(voteType) && needsScoreStep(voteType)
            ? '순위를 정한 뒤 항목별 점수를 매겨주세요.'
            : needsRankStep(voteType)
              ? '드래그하거나 화살표로 순위를 변경하세요.'
              : '각 시안에 대해 1~5점으로 평가하세요.'}
        </p>
      </div>

      {needsRankStep(voteType) && (
        <div>
          <h3 className="mb-3 text-sm font-bold text-ink">순위 매기기</h3>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={rankedIds} strategy={verticalListSortingStrategy}>
              <ul className="space-y-2">
                {rankedIds.map((itemId, idx) => {
                  const item = items.find((i) => i.id === itemId)
                  if (!item) return null
                  return (
                    <SortableRankItem
                      key={itemId}
                      id={itemId}
                      rank={idx + 1}
                      title={item.title}
                      fileRef={item.current_version?.file_url}
                      onMoveUp={() => {
                        if (idx === 0) return
                        const list =
                          voteType === 'combined'
                            ? rankings.filter((r) => selected.includes(r))
                            : rankings
                        const full = [...rankings]
                        const a = full.indexOf(list[idx])
                        const b = full.indexOf(list[idx - 1])
                        setRankings(arrayMove(full, a, b))
                      }}
                      onMoveDown={() => {
                        const list =
                          voteType === 'combined'
                            ? rankings.filter((r) => selected.includes(r))
                            : rankings
                        if (idx >= list.length - 1) return
                        const full = [...rankings]
                        const a = full.indexOf(list[idx])
                        const b = full.indexOf(list[idx + 1])
                        setRankings(arrayMove(full, a, b))
                      }}
                    />
                  )
                })}
              </ul>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {needsScoreStep(voteType) && (
        <div>
          <h3 className="mb-3 text-sm font-bold text-ink">항목별 점수 (1~5)</h3>
          <div className="space-y-4">
            {scoredItems.map((item) => (
              <div key={item.id} className="rounded-xl border border-border bg-surface p-4">
                <h4 className="mb-3 font-medium text-ink">{item.title}</h4>
                {SCORE_CRITERIA.map((criterion) => (
                  <div key={criterion} className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-sm text-ink-muted">{criterion}</span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          className={`h-8 w-8 rounded-lg text-sm font-medium ${
                            scores[item.id]?.[criterion] === n
                              ? 'bg-accent text-white'
                              : 'bg-surface-raised text-ink-muted hover:bg-accent-soft'
                          }`}
                          onClick={() =>
                            setScores((prev) => ({
                              ...prev,
                              [item.id]: { ...prev[item.id], [criterion]: n },
                            }))
                          }
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ConfirmStep({
  items,
  selected,
  rankedIds,
  scoredItems,
  scores,
  voteType,
  comment,
  setComment,
}: {
  items: DesignItem[]
  selected: string[]
  rankedIds: string[]
  scoredItems: DesignItem[]
  scores: Record<string, Record<string, number>>
  voteType: VoteType
  comment: string
  setComment: (v: string) => void
}) {
  const selectedItems =
    voteType === 'rank'
      ? rankedIds.map((id) => items.find((i) => i.id === id)).filter(Boolean)
      : voteType === 'score'
        ? scoredItems
        : selected.map((id) => items.find((i) => i.id === id)).filter(Boolean)

  return (
    <div>
      <h2 className="mb-1 text-lg font-bold text-ink">3. 확인 및 제출</h2>
      <p className="mb-4 text-sm text-ink-muted">내용을 확인한 뒤 제출해주세요. 제출 후 수정할 수 없습니다.</p>

      <div className="mb-5 rounded-xl border border-border bg-surface p-4">
        <h3 className="mb-3 text-sm font-bold text-ink">선택 요약</h3>
        <ul className="space-y-2">
          {selectedItems.map((item, idx) => {
            if (!item) return null
            const rank = needsRankStep(voteType) ? rankedIds.indexOf(item.id) + 1 : null
            return (
              <li key={item.id} className="flex items-center gap-3 text-sm">
                {rank != null && rank > 0 && (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">
                    {rank}
                  </span>
                )}
                <span className="font-medium text-ink">{item.title}</span>
                {needsScoreStep(voteType) && scores[item.id] && (
                  <span className="text-xs text-ink-muted">
                    평균{' '}
                    {(
                      Object.values(scores[item.id]).reduce((a, b) => a + b, 0) /
                      Math.max(1, Object.values(scores[item.id]).length)
                    ).toFixed(1)}
                  </span>
                )}
                {rank == null && voteType === 'single' && idx === 0 && (
                  <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent">
                    선택
                  </span>
                )}
              </li>
            )
          })}
          {selectedItems.length === 0 && (
            <li className="text-sm text-ink-muted">선택된 시안이 없습니다</li>
          )}
        </ul>
      </div>

      <h3 className="mb-2 text-sm font-bold text-ink">추가 의견 (선택)</h3>
      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={4}
        placeholder="자유롭게 의견을 남겨주세요"
      />
    </div>
  )
}

function DonePanel({
  projectId,
  selected,
  items,
  comment,
  onHome,
}: {
  projectId: string
  selected: string[]
  items: DesignItem[]
  comment: string
  onHome: () => void
}) {
  const navigate = useNavigate()
  return (
    <div className="py-6 text-center sm:py-10">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-2xl text-emerald-600">
        ✓
      </div>
      <h2 className="text-2xl font-bold text-ink">투표 완료!</h2>
      <p className="mt-2 text-sm text-ink-muted">소중한 의견 감사합니다. 제출이 완료되었습니다.</p>
      {selected.length > 0 && (
        <p className="mt-4 text-sm text-ink">
          선택:{' '}
          {selected
            .map((id) => items.find((i) => i.id === id)?.title)
            .filter(Boolean)
            .join(', ')}
        </p>
      )}
      {comment && (
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted line-clamp-3">"{comment}"</p>
      )}
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        <Button variant="secondary" onClick={onHome}>
          프로젝트로
        </Button>
        <Button onClick={() => navigate(`/projects/${projectId}/report`)}>보고서 보기</Button>
      </div>
    </div>
  )
}

function SortableRankItem({
  id,
  rank,
  title,
  fileRef,
  onMoveUp,
  onMoveDown,
}: {
  id: string
  rank: number
  title: string
  fileRef?: string
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }
  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5 ${
        isDragging ? 'z-10 shadow-md' : ''
      }`}
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">
        {rank}
      </span>
      {fileRef && (
        <div className="h-10 w-14 shrink-0 overflow-hidden rounded-md bg-surface-raised">
          <StoredImage fileRef={fileRef} alt="" className="h-full w-full object-contain" />
        </div>
      )}
      <span
        className="flex-1 cursor-grab text-sm font-medium active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        {title}
      </span>
      <div className="flex flex-col">
        <button type="button" className="text-xs text-ink-muted hover:text-accent" onClick={onMoveUp}>
          ▲
        </button>
        <button
          type="button"
          className="text-xs text-ink-muted hover:text-accent"
          onClick={onMoveDown}
        >
          ▼
        </button>
      </div>
    </li>
  )
}

function IconCalendar() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  )
}

function IconInfo() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  )
}

function IconExternal() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <path d="M15 3h6v6M10 14L21 3" />
    </svg>
  )
}
