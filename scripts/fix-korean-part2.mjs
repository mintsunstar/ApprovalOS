import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const L = JSON.parse(fs.readFileSync(path.join(root, 'scripts/ko-ui-labels.json'), 'utf8'))
const j = (s) => JSON.stringify(s)

function write(rel, content) {
  fs.writeFileSync(path.join(root, rel), content, 'utf8')
  console.log('wrote', rel, 'hangul', /[\uAC00-\uD7A3]/.test(content))
}

write(
  'src/pages/ProjectVote.tsx',
  `import { useEffect, useState } from 'react'
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
          toast.error(${j(L.vote.selectOne)})
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
      toast.success(${j(L.vote.submitted)})
    } catch (err) {
      toast.error(err instanceof Error ? err.message : ${j(L.vote.fail)})
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
          <p className="text-lg text-ink-muted">{${j(L.vote.closed)}}</p>
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
          <h2 className="text-2xl font-bold">{${j(L.vote.thanks)}}</h2>
          <p className="text-ink-muted">{${j(L.vote.thanksDesc)}}</p>
          <Button onClick={() => navigate(\`/projects/\${project.id}\`)}>{${j(L.vote.goMain)}}</Button>
        </div>
      </div>
    )
  }

  const totalSteps = stepsForType()

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col">
      <ProjectHeader project={project} />
      <ProjectLNB project={project} isAdmin={isAdmin} />
      <div className="mx-auto w-full max-w-2xl p-4 sm:p-6">
        <div className="mb-6 flex gap-2">
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
            <div
              key={s}
              className={\`h-1.5 flex-1 rounded-full \${s <= step ? 'bg-accent' : 'bg-border'}\`}
            />
          ))}
        </div>

        {(voteType === 'single' || (voteType === 'combined' && step === 1)) && (
          <div>
            <h2 className="mb-4 text-lg font-bold">
              {voteType === 'single' ? ${j(L.vote.pickSingle)} : ${j(L.vote.pickMulti)}}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {items.map((item) => (
                <label
                  key={item.id}
                  className={\`card cursor-pointer overflow-hidden transition \${
                    selected.includes(item.id) ? 'border-accent ring-2 ring-accent/20' : ''
                  }\`}
                >
                  <div className="aspect-video bg-surface">
                    {item.current_version?.file_url && (
                      <StoredImage
                        fileRef={item.current_version.file_url}
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
            <h2 className="mb-4 text-lg font-bold">{${j(L.vote.rankTitle)}}</h2>
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
            <h2 className="mb-4 text-lg font-bold">{${j(L.vote.scoreTitle)}}</h2>
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
                              className={\`h-8 w-8 rounded-lg text-sm font-medium \${
                                scores[item.id]?.[criterion] === n
                                  ? 'bg-accent text-white'
                                  : 'bg-surface text-ink-muted hover:bg-accent-soft'
                              }\`}
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
            <h2 className="mb-4 text-lg font-bold">{${j(L.vote.commentTitle)}}</h2>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              placeholder={${j(L.vote.commentPh)}}
            />
          </div>
        )}

        <div className="mt-8 flex justify-between">
          <Button variant="secondary" disabled={step === 1} onClick={() => setStep(step - 1)}>
            {${j(L.vote.prev)}}
          </Button>
          {step < totalSteps ? (
            <Button
              onClick={() => {
                if (
                  (voteType === 'single' || voteType === 'combined') &&
                  step === 1 &&
                  selected.length === 0
                ) {
                  toast.error(${j(L.vote.selectOne)})
                  return
                }
                setStep(step + 1)
              }}
            >
              {${j(L.vote.next)}}
            </Button>
          ) : (
            <Button loading={loading} onClick={submit}>
              {${j(L.vote.submit)}}
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
    <li ref={setNodeRef} style={style} className="card flex items-center gap-3 px-4 py-3">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">
        {rank}
      </span>
      <span className="flex-1 text-sm font-medium" {...attributes} {...listeners}>
        {title}
      </span>
      <div className="flex flex-col">
        <button type="button" className="text-xs text-ink-muted hover:text-accent" onClick={onMoveUp}>
          {'\\u25B2'}
        </button>
        <button type="button" className="text-xs text-ink-muted hover:text-accent" onClick={onMoveDown}>
          {'\\u25BC'}
        </button>
      </div>
    </li>
  )
}
`
)

write(
  'src/pages/ProjectReport.tsx',
  `import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Button } from '@/components/common/Button'
import { ProjectLNB, ProjectHeader } from '@/components/layout/ProjectLayout'
import { useAuthStore } from '@/stores/authStore'
import { useProjectStore } from '@/stores/projectStore'
import { localApi } from '@/lib/localDb'
import { toast } from '@/stores/toastStore'

const OPTIONS = [
  { key: 'votes', label: ${j(L.report.votes)} },
  { key: 'ai', label: ${j(L.report.ai)} },
  { key: 'pins', label: ${j(L.report.pins)} },
  { key: 'approval', label: ${j(L.report.approval)} },
  { key: 'members', label: ${j(L.report.members)} },
] as const

export function ProjectReport() {
  const { id } = useParams<{ id: string }>()
  const user = useAuthStore((s) => s.user)
  const { currentProject, items, loadProject } = useProjectStore()
  const [selected, setSelected] = useState<string[]>(OPTIONS.map((o) => o.key))
  const [email, setEmail] = useState('')
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    if (id) loadProject(id)
  }, [id, loadProject])

  if (!currentProject || !user) return null
  const project = currentProject
  const analysis = localApi.getAnalysis(project.id)
  const votes = localApi.getVotes(project.id)
  const lines = localApi.getApprovalLines(project.id)
  const voteRate = project.vote_rate ?? 0

  const toggle = (key: string) => {
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  }

  const buildReportHtml = () => {
    let body = \`<h1>\${project.title}</h1><p>\${${j(L.report.createdAt)}}: \${new Date().toLocaleDateString('ko-KR')}</p>\`
    if (selected.includes('votes')) {
      body += \`<h2>\${${j(L.report.votes)}}</h2><ul>\`
      for (const item of items) {
        body += \`<li>\${item.title}: \${item.vote_count ?? 0}\${${j(L.report.tickets)}} (\${item.vote_rate ?? 0}%) \${${j(L.report.score)}}\${item.avg_score ?? 0}</li>\`
      }
      body += \`</ul><p>\${${j(L.report.totalVotes)}}: \${votes.length}\${${j(L.report.tickets)}}</p>\`
    }
    if (selected.includes('ai') && analysis) {
      body += \`<h2>\${${j(L.report.ai)}}</h2><p>\${analysis.overall_summary}</p>\`
    }
    if (selected.includes('pins')) {
      body += \`<h2>\${${j(L.report.pins)}}</h2><ul>\`
      for (const item of items) {
        body += \`<li>\${item.title}: \${localApi.getPins(item.id).length}\${${j(L.report.count)}}</li>\`
      }
      body += '</ul>'
    }
    if (selected.includes('approval')) {
      body += \`<h2>\${${j(L.report.approval)}}</h2><ul>\`
      for (const line of lines) {
        for (const a of line.actions ?? []) {
          body += \`<li>\${line.step_name}: \${a.action}</li>\`
        }
      }
      body += '</ul>'
    }
    if (selected.includes('members')) {
      body += \`<h2>\${${j(L.report.members)}}</h2><p>\${project.member_count}\${${j(L.report.people)}}</p>\`
    }
    return \`<!DOCTYPE html><html><head><title>\${project.title} \${${j(L.report.reportTitle)}}</title>
      <style>body{font-family:sans-serif;padding:40px;max-width:800px;margin:auto}h1{color:#2563eb}</style>
      </head><body>\${body}</body></html>\`
  }

  const generatePdf = () => {
    if (voteRate < 50) toast.warning(${j(L.report.voteWarn)})
    setGenerating(true)
    setTimeout(() => {
      const w = window.open('', '_blank')
      if (w) {
        w.document.write(buildReportHtml())
        w.document.close()
        w.print()
      }
      toast.success(${j(L.report.pdfDone)})
      setGenerating(false)
    }, 400)
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col">
      <ProjectHeader project={project} />
      <ProjectLNB project={project} isAdmin={user.role === 'admin'} />
      <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-4 font-bold">{${j(L.report.options)}}</h2>
          <div className="space-y-2">
            {OPTIONS.map((o) => (
              <label key={o.key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selected.includes(o.key)}
                  onChange={() => toggle(o.key)}
                />
                {o.label}
              </label>
            ))}
          </div>
          <div className="mt-6 flex flex-col gap-3">
            <Button loading={generating} onClick={generatePdf}>
              {${j(L.report.pdfBtn)}}
            </Button>
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-lg border border-border px-3 py-2 text-sm"
                placeholder={${j(L.report.emailPh)}}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button
                variant="secondary"
                onClick={() => {
                  if (!email.trim()) {
                    toast.error(${j(L.report.emailNeed)})
                    return
                  }
                  toast.success(\`\${email}\${${j(L.report.emailSent)}}\`)
                }}
              >
                {${j(L.report.send)}}
              </Button>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <h2 className="mb-4 font-bold">{${j(L.report.preview)}}</h2>
          <h3 className="font-semibold text-accent">{project.title}</h3>
          {selected.includes('votes') && (
            <div className="mt-3">
              <p className="text-sm font-medium">{${j(L.report.votes)}}</p>
              <ul className="mt-1 space-y-1 text-sm text-ink-muted">
                {items.map((i) => (
                  <li key={i.id}>
                    {i.title}: {i.vote_count ?? 0}{${j(L.report.tickets)}}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {selected.includes('ai') && analysis && (
            <div className="mt-3">
              <p className="text-sm font-medium">{${j(L.report.ai)}}</p>
              <p className="mt-1 line-clamp-4 text-sm text-ink-muted">{analysis.overall_summary}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
`
)

write(
  'src/pages/ProjectSettings.tsx',
  `import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/common/Button'
import { Input, Select } from '@/components/common/Input'
import { ConfirmDialog } from '@/components/common/Modal'
import { ProjectLNB, ProjectHeader } from '@/components/layout/ProjectLayout'
import { useAuthStore } from '@/stores/authStore'
import { useProjectStore } from '@/stores/projectStore'
import { localApi } from '@/lib/localDb'
import { toast } from '@/stores/toastStore'
import type { VoteType } from '@/types'

export function ProjectSettings() {
  const { id } = useParams<{ id: string }>()
  const user = useAuthStore((s) => s.user)
  const { currentProject, loadProject } = useProjectStore()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [deadline, setDeadline] = useState('')
  const [voteType, setVoteType] = useState<VoteType>('combined')
  const [visibility, setVisibility] = useState<'internal' | 'link'>('internal')
  const [deleteOpen, setDeleteOpen] = useState(false)

  useEffect(() => {
    if (id) loadProject(id)
  }, [id, loadProject])

  useEffect(() => {
    if (currentProject) {
      setTitle(currentProject.title)
      setDeadline(currentProject.deadline.slice(0, 10))
      setVoteType(currentProject.vote_type)
      setVisibility(currentProject.visibility)
    }
  }, [currentProject])

  if (!currentProject || !user) return null
  if (user.role !== 'admin' && user.id !== currentProject.created_by) {
    navigate(\`/projects/\${id}\`)
    return null
  }

  const project = currentProject

  const save = () => {
    localApi.updateProject(project.id, {
      title: title.trim(),
      deadline: new Date(deadline).toISOString(),
      vote_type: voteType,
      visibility,
      public_token:
        visibility === 'link'
          ? project.public_token ?? crypto.randomUUID().slice(0, 12)
          : null,
    })
    toast.success(${j(L.settings.saved)})
    loadProject(project.id)
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col">
      <ProjectHeader project={project} />
      <ProjectLNB project={project} isAdmin />
      <div className="mx-auto w-full max-w-lg space-y-4 p-4 sm:p-6">
        <div className="card space-y-4 p-5">
          <Input label={${j(L.settings.projectName)}} value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input
            label={${j(L.settings.deadline)}}
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
          <Select
            label={${j(L.settings.voteType)}}
            value={voteType}
            onChange={(e) => setVoteType(e.target.value as VoteType)}
            options={[
              { value: 'single', label: ${j(L.settings.single)} },
              { value: 'rank', label: ${j(L.settings.rank)} },
              { value: 'score', label: ${j(L.settings.score)} },
              { value: 'combined', label: ${j(L.settings.combined)} },
            ]}
          />
          <Select
            label={${j(L.settings.visibility)}}
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as 'internal' | 'link')}
            options={[
              { value: 'internal', label: ${j(L.settings.internal)} },
              { value: 'link', label: ${j(L.settings.link)} },
            ]}
          />
          {visibility === 'link' && project.public_token && (
            <div className="rounded-lg bg-accent-soft p-3 text-sm">
              {${j(L.settings.publicLink)}}{' '}
              <code className="text-accent">/vote/{project.public_token}</code>
              <Button
                size="sm"
                variant="secondary"
                className="ml-2"
                onClick={() => {
                  navigator.clipboard.writeText(
                    \`\${window.location.origin}/vote/\${project.public_token}\`
                  )
                  toast.success(${j(L.settings.copied)})
                }}
              >
                {${j(L.settings.copy)}}
              </Button>
            </div>
          )}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={save}>{${j(L.settings.save)}}</Button>
            {project.status !== 'closed' ? (
              <Button
                variant="secondary"
                onClick={() => {
                  if (confirm(${j(L.settings.closeConfirm)})) {
                    localApi.updateProject(project.id, { status: 'closed' })
                    toast.success(${j(L.settings.closed)})
                    loadProject(project.id)
                  }
                }}
              >
                {${j(L.settings.closeBtn)}}
              </Button>
            ) : (
              <Button
                variant="secondary"
                onClick={() => {
                  localApi.updateProject(project.id, { status: 'active' })
                  toast.success(${j(L.settings.reopened)})
                  loadProject(project.id)
                }}
              >
                {${j(L.settings.reopenBtn)}}
              </Button>
            )}
          </div>
        </div>
        <button
          className="text-sm font-medium text-danger hover:underline"
          onClick={() => setDeleteOpen(true)}
        >
          {${j(L.settings.deleteBtn)}}
        </button>
      </div>
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={${j(L.settings.deleteTitle)}}
        description={${j(L.settings.deleteDesc)}}
        confirmLabel={${j(L.settings.deleteConfirm)}}
        danger
        onConfirm={() => {
          localApi.deleteProject(project.id)
          toast.success(${j(L.settings.deleted)})
          navigate('/dashboard')
        }}
      />
    </div>
  )
}
`
)

console.log('part2 done')
