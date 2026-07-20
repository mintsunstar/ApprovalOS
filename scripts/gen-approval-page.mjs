import fs from 'fs'

const L = JSON.parse(
  fs.readFileSync(new URL('./ko-approval-labels.json', import.meta.url), 'utf8')
)

const j = (s) => JSON.stringify(s)

const src = `import { useEffect, useState } from 'react'
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
import type { ApprovalLine } from '@/types'

export function ProjectApproval() {
  const { id } = useParams<{ id: string }>()
  const user = useAuthStore((s) => s.user)
  const { currentProject, loadProject } = useProjectStore()
  const [lines, setLines] = useState<ApprovalLine[]>([])
  const navigate = useNavigate()

  const refresh = () => {
    if (!id) return
    loadProject(id)
    setLines(localApi.getApprovalLines(id))
  }

  useEffect(() => {
    refresh()
  }, [id])

  if (!currentProject || !user) return null
  const project = currentProject
  const isAdmin = user.role === 'admin' || user.id === project.created_by
  const rejectedLine = lines.find((l) => l.status === 'rejected')
  const activeLine = lines.find((l) => l.status === 'active')
  const canApprove =
    activeLine &&
    activeLine.approver_ids.includes(user.id) &&
    !activeLine.actions?.some((a) => a.user_id === user.id)

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col">
      <ProjectHeader
        project={project}
        actions={
          <>
            {isAdmin && project.status !== 'approval' && project.status !== 'closed' && (
              <Button
                size="sm"
                onClick={() => {
                  if (!project.use_approval || lines.length === 0) {
                    toast.error(${j(L.noLine)})
                    return
                  }
                  localApi.startApproval(project.id)
                  toast.success(${j(L.started)})
                  refresh()
                }}
              >
                {${j(L.startBtn)}}
              </Button>
            )}
            {canApprove && (
              <Button size="sm" onClick={() => navigate(\`/projects/\${project.id}/approval/review\`)}>
                {${j(L.progressBtn)}}
              </Button>
            )}
          </>
        }
      />
      <ProjectLNB project={project} isAdmin={isAdmin} />
      <div className="mx-auto w-full max-w-2xl p-6">
        {rejectedLine && (
          <div className="card mb-6 border-danger/30 bg-danger-soft p-5">
            <h3 className="font-bold text-danger">
              {rejectedLine.step_order}{${j('\uB2E8\uACC4\uC5D0\uC11C \uBC18\uB824\uB418\uC5C8\uC2B5\uB2C8\uB2E4')}}
            </h3>
            <p className="mt-2 text-sm">
              {${j(L.reason)}}{' '}
              {rejectedLine.actions?.find((a) => a.action === 'rejected')?.reject_reason ?? '-'}
            </p>
            {isAdmin && (
              <Button
                className="mt-4"
                size="sm"
                onClick={() => {
                  localApi.restartApproval(project.id)
                  toast.success(${j(L.restartOk)})
                  refresh()
                }}
              >
                {${j(L.restartBtn)}}
              </Button>
            )}
          </div>
        )}

        <h2 className="mb-4 text-lg font-bold">{${j(L.timeline)}}</h2>
        {lines.length === 0 ? (
          <p className="text-sm text-ink-muted">{${j(L.noLines)}}</p>
        ) : (
          <ol className="space-y-3">
            {lines.map((line) => (
              <li key={line.id} className="card p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <StatusIcon status={line.status} />
                  <span className="font-semibold">
                    {line.step_order}{${j(L.step)}} {line.step_name}
                  </span>
                  <Badge
                    tone={
                      line.status === 'completed'
                        ? 'success'
                        : line.status === 'active'
                          ? 'accent'
                          : line.status === 'rejected'
                            ? 'danger'
                            : 'default'
                    }
                  >
                    {line.status === 'completed'
                      ? ${j(L.done)}
                      : line.status === 'active'
                        ? ${j(L.active)}
                        : line.status === 'rejected'
                          ? ${j(L.rejected)}
                          : ${j(L.pending)}}
                  </Badge>
                  <span className="text-xs text-ink-muted">
                    ({line.approval_type === 'all' ? ${j(L.all)} : ${j(L.majority)}})
                  </span>
                </div>
                <ul className="ml-7 space-y-1">
                  {(line.approvers ?? []).map((approver) => {
                    const action = line.actions?.find((a) => a.user_id === approver.id)
                    return (
                      <li key={approver.id} className="flex items-center gap-2 text-sm">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-soft text-xs text-accent">
                          {approver.name.charAt(0)}
                        </span>
                        {approver.name}
                        <span className="text-ink-muted">
                          {action
                            ? action.action === 'approved'
                              ? ${j(L.approved)}
                              : ${j(L.rejected)}
                            : ${j(L.waiting)}}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </li>
            ))}
          </ol>
        )}

        <h2 className="mb-3 mt-8 text-lg font-bold">{${j(L.history)}}</h2>
        <ul className="space-y-2 text-sm text-ink-muted">
          {lines.flatMap((line) =>
            (line.actions ?? []).map((a) => (
              <li key={a.id}>
                {new Date(a.created_at).toLocaleDateString('ko-KR')}{' '}
                {line.approvers?.find((u) => u.id === a.user_id)?.name} - {line.step_order}{${j(L.step)}}{' '}
                {a.action === 'approved' ? ${j(L.approved)} : ${j(L.rejected)}}
              </li>
            ))
          )}
          {lines.every((l) => !l.actions?.length) && <li>{${j(L.noHistory)}}</li>}
        </ul>
      </div>
    </div>
  )
}

function StatusIcon({ status }: { status: ApprovalLine['status'] }) {
  if (status === 'completed') return <span className="text-success">${'\\u25CF'}</span>
  if (status === 'active') return <span className="animate-pulse text-accent">${'\\u25CF'}</span>
  if (status === 'rejected') return <span className="text-danger">${'\\u25CF'}</span>
  return <span className="text-border">${'\\u25CB'}</span>
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
      toast.success(${j(L.approveOk)})
      navigate(\`/projects/\${project.id}/approval\`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : ${j(L.approveFail)})
    } finally {
      setLoading(false)
      setConfirmOpen(false)
    }
  }

  const reject = () => {
    if (!activeLine) return
    if (rejectReason.trim().length < 10) {
      toast.error(${j(L.rejectMin)})
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
      toast.success(${j(L.rejectOk)})
      navigate(\`/projects/\${project.id}/approval\`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : ${j(L.rejectFail)})
    } finally {
      setLoading(false)
      setRejectOpen(false)
    }
  }

  const finalTitle = items.find((i) => i.id === selectedItem)?.title ?? ${j(L.noneLabel)}

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col">
      <ProjectHeader project={project} />
      <ProjectLNB project={project} isAdmin={user.role === 'admin'} />
      <div className="mx-auto w-full max-w-3xl p-6">
        <h2 className="mb-2 text-lg font-bold">
          {activeLine?.step_name ?? ${j(L.approval)}} {${j(L.review)}}
        </h2>

        <section className="mt-6">
          <h3 className="mb-3 font-semibold">{${j(L.list)}}</h3>
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
                  <Badge tone="accent">{i + 1}{${j(L.rank)}}</Badge>
                  <p className="mt-1 font-semibold">{item.title}</p>
                  <p className="text-ink-muted">
                    {item.vote_count ?? 0}{${j(L.votes)}} / {item.avg_score ?? 0}{${j(L.score)}}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="card mt-6 p-4">
          <h3 className="mb-2 font-semibold">{${j(L.summary)}}</h3>
          {sortedItems.slice(0, 3).map((item, i) => (
            <p key={item.id} className="text-sm text-ink-muted">
              {i + 1}{${j(L.rank)}}: {item.title} ({item.vote_rate ?? 0}%)
            </p>
          ))}
        </section>

        {analysis && (
          <section className="card mt-4 border-accent/20 bg-accent-soft/40 p-4">
            <h3 className="mb-2 font-semibold">{${j(L.aiSummary)}}</h3>
            <p className="text-sm leading-relaxed text-ink-muted">{analysis.overall_summary}</p>
          </section>
        )}

        <section className="mt-6">
          <h3 className="mb-3 font-semibold">{${j(L.pickFinal)}}</h3>
          <div className="flex flex-wrap gap-3">
            {sortedItems.map((item, i) => (
              <label key={item.id} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="final"
                  checked={selectedItem === item.id}
                  onChange={() => setSelectedItem(item.id)}
                />
                {item.title} {i === 0 ? ${j(L.recommend)} : ''}
              </label>
            ))}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="final"
                checked={selectedItem === null}
                onChange={() => setSelectedItem(null)}
              />
              {${j(L.none)}}
            </label>
          </div>
        </section>

        <div className="mt-8 flex justify-end gap-3">
          <Button variant="danger" onClick={() => setRejectOpen(true)}>
            {${j(L.reject)}}
          </Button>
          <Button variant="success" onClick={() => setConfirmOpen(true)}>
            {${j(L.approveDone)}}
          </Button>
        </div>

        <Modal
          open={rejectOpen}
          onClose={() => setRejectOpen(false)}
          title={${j(L.rejectTitle)}}
          footer={
            <>
              <Button variant="secondary" onClick={() => setRejectOpen(false)}>
                {${j(L.cancel)}}
              </Button>
              <Button variant="danger" loading={loading} onClick={reject}>
                {${j(L.rejectDo)}}
              </Button>
            </>
          }
        >
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value.slice(0, 500))}
            rows={4}
            placeholder={${j(L.rejectPh)}}
          />
          <p className="mt-1 text-xs text-ink-muted">{${j(L.chars)}} {rejectReason.length}/500</p>
        </Modal>

        <ConfirmDialog
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          onConfirm={approve}
          title={${j(L.confirmTitle)}}
          description={${j(L.confirmDesc)}.replace('{t}', finalTitle)}
          confirmLabel={${j(L.approveDone)}}
          loading={loading}
        />
      </div>
    </div>
  )
}
`

fs.writeFileSync(new URL('../src/pages/ProjectApproval.tsx', import.meta.url), src, 'utf8')
const out = fs.readFileSync(new URL('../src/pages/ProjectApproval.tsx', import.meta.url), 'utf8')
console.log('hangul', /[\uAC00-\uD7A3]/.test(out), 'has start', out.includes(L.startBtn))
