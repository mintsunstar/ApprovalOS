import { useEffect, useState } from 'react'
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
import { ProjectLNB, ProjectHeader } from '@/components/layout/ProjectLayout'
import { useAuthStore } from '@/stores/authStore'
import { useProjectStore } from '@/stores/projectStore'
import { localApi } from '@/lib/localDb'
import { toast } from '@/stores/toastStore'
import { SCORE_CRITERIA } from '@/types'

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

  useEffect(() => {
    if (id) loadProject(id)
  }, [id, loadProject])

  useEffect(() => {
    if (items.length && rankings.length === 0) {
      setRankings(items.map((i) => i.id))
    }
  }, [items, rankings.length])

  if (!currentProject || !user) return null
  const project = currentProject
  const isClosed = project.status === 'closed'
  const voteType = project.vote_type
  const isAdmin = user.role === 'admin'

  const stepsForType = () => {
    if (voteType === 'single') return 2
    if (voteType === 'rank') return 2
    if (voteType === 'score') return 2
    return 4
  }

  const sensors = useSensors(useSensor(PointerSensor))

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setRankings((list) => {
      const oldIndex = list.indexOf(String(active.id))
      const newIndex = list.indexOf(String(over.id))
      return arrayMove(list, oldIndex, newIndex)
    })
  }

  const submit = () => {
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
          toast.error('??? ??????')
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
      }

      setDone(true)
      toast.success('??? ???????')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '?? ??')
    } finally {
      setLoading(false)
    }
  }

  if (isClosed) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] flex-col">
        <ProjectHeader project={project} />
        <ProjectLNB project={project} isAdmin={isAdmin} />
        <div className="flex flex-1 items-center justify-center p-8">
          <p className="text-lg text-ink-muted">??? ???????</p>
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] flex-col">
        <ProjectHeader project={project} />
        <ProjectLNB project={project} isAdmin={isAdmin} />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
          <h2 className="text-2xl font-bold">?? ??!</h2>
          <p className="text-ink-muted">??? ???????</p>
          <Button onClick={() => navigate(`/projects/${project.id}`)}>?? ??</Button>
        </div>
      </div>
    )
  }

  const totalSteps = stepsForType()

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col">
      <ProjectHeader project={project} />
      <ProjectLNB project={project} isAdmin={isAdmin} />
      <div className="mx-auto w-full max-w-2xl p-6">
        <div className="mb-6 flex gap-2">
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full ${s <= step ? 'bg-accent' : 'bg-border'}`}
            />
          ))}
        </div>

        {(voteType === 'single' || (voteType === 'combined' && step === 1)) && (
          <div>
            <h2 className="mb-4 text-lg font-bold">
              {voteType === 'single' ? '?? ??? ?????' : '?? ??'}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {items.map((item) => (
                <label
                  key={item.id}
                  className={`card cursor-pointer overflow-hidden transition ${
                    selected.includes(item.id) ? 'border-accent ring-2 ring-accent/20' : ''
                  }`}
                >
                  <div className="aspect-video bg-surface">
                    {item.current_version?.file_url && (
                      <img
                        src={item.current_version.file_url}
                        alt=""
                        className="h-full w-full object-contain"
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-2 p-3">
                    <input
                      type={voteType === 'single' ? 'radio' : 'checkbox'}
                      checked={selected.includes(item.id)}
                      onChange={() => {
                        if (voteType === 'single') setSelected([item.id])
                        else
                          setSelected((prev) =>
                            prev.includes(item.id)
                              ? prev.filter((x) => x !== item.id)
                              : [...prev, item.id]
                          )
                      }}
                    />
                    <span className="text-sm font-medium">{item.title}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {(voteType === 'rank' || (voteType === 'combined' && step === 2)) && (
          <div>
            <h2 className="mb-4 text-lg font-bold">?? ???</h2>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext
                items={
                  voteType === 'combined' ? rankings.filter((r) => selected.includes(r)) : rankings
                }
                strategy={verticalListSortingStrategy}
              >
                <ul className="space-y-2">
                  {(voteType === 'combined'
                    ? rankings.filter((r) => selected.includes(r))
                    : rankings
                  ).map((itemId, idx) => {
                    const item = items.find((i) => i.id === itemId)
                    if (!item) return null
                    return (
                      <SortableRankItem
                        key={itemId}
                        id={itemId}
                        rank={idx + 1}
                        title={item.title}
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

        {(voteType === 'score' || (voteType === 'combined' && step === 3)) && (
          <div>
            <h2 className="mb-4 text-lg font-bold">??? ?? (1~5)</h2>
            <div className="space-y-4">
              {(voteType === 'combined' ? items.filter((i) => selected.includes(i.id)) : items).map(
                (item) => (
                  <div key={item.id} className="card p-4">
                    <h3 className="mb-3 font-medium">{item.title}</h3>
                    {SCORE_CRITERIA.map((criterion) => (
                      <div key={criterion} className="mb-2 flex items-center justify-between">
                        <span className="text-sm text-ink-muted">{criterion}</span>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <button
                              key={n}
                              type="button"
                              className={`h-8 w-8 rounded-lg text-sm font-medium ${
                                scores[item.id]?.[criterion] === n
                                  ? 'bg-accent text-white'
                                  : 'bg-surface text-ink-muted hover:bg-accent-soft'
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
                )
              )}
            </div>
          </div>
        )}

        {((voteType === 'combined' && step === 4) ||
          (voteType !== 'combined' && step === totalSteps)) && (
          <div>
            <h2 className="mb-4 text-lg font-bold">?? ?? (??)</h2>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              placeholder="?? ??? ???? ?????"
            />
          </div>
        )}

        <div className="mt-8 flex justify-between">
          <Button variant="secondary" disabled={step === 1} onClick={() => setStep(step - 1)}>
            ??
          </Button>
          {step < totalSteps ? (
            <Button
              onClick={() => {
                if (
                  (voteType === 'single' || voteType === 'combined') &&
                  step === 1 &&
                  selected.length === 0
                ) {
                  toast.error('??? ??????')
                  return
                }
                setStep(step + 1)
              }}
            >
              ??
            </Button>
          ) : (
            <Button loading={loading} onClick={submit}>
              ??
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function SortableRankItem({
  id,
  rank,
  title,
  onMoveUp,
  onMoveDown,
}: {
  id: string
  rank: number
  title: string
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }
  return (
    <li
      ref={setNodeRef}
      style={style}
      className="card flex items-center gap-3 px-4 py-3"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">
        {rank}
      </span>
      <span className="flex-1 text-sm font-medium" {...attributes} {...listeners}>
        {title}
      </span>
      <div className="flex flex-col">
        <button type="button" className="text-xs text-ink-muted hover:text-accent" onClick={onMoveUp}>
          ?
        </button>
        <button type="button" className="text-xs text-ink-muted hover:text-accent" onClick={onMoveDown}>
          ?
        </button>
      </div>
    </li>
  )
}
