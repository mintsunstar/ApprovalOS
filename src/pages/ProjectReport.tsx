import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Button } from '@/components/common/Button'
import { ProjectLNB, ProjectHeader } from '@/components/layout/ProjectLayout'
import { useAuthStore } from '@/stores/authStore'
import { useProjectStore } from '@/stores/projectStore'
import { localApi } from '@/lib/localDb'
import { toast } from '@/stores/toastStore'
import { STATUS_LABELS } from '@/types'

const OPTIONS = [
  {
    key: 'votes',
    label: '투표 결과',
    desc: '시안별 득표 현황과 그래프',
  },
  {
    key: 'ai',
    label: 'AI 분석',
    desc: '요약·인사이트 결과',
  },
  {
    key: 'pins',
    label: '핀 댓글 요약',
    desc: '핵심 의견과 코멘트',
  },
  {
    key: 'approval',
    label: '승인 이력',
    desc: '단계별 진행 현황',
  },
  {
    key: 'members',
    label: '참여자 정보',
    desc: '참여자 목록과 통계',
  },
] as const

export function ProjectReport() {
  const { id } = useParams<{ id: string }>()
  const user = useAuthStore((s) => s.user)
  const { currentProject, items, loadProject } = useProjectStore()
  const [selected, setSelected] = useState<string[]>(OPTIONS.map((o) => o.key))
  const [email, setEmail] = useState('')
  const [shareMode, setShareMode] = useState<'link-pdf' | 'link' | 'pdf'>('link-pdf')
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    if (id) loadProject(id)
  }, [id, loadProject])

  const project = currentProject
  const analysis = project ? localApi.getAnalysis(project.id) : null
  const votes = project ? localApi.getVotes(project.id) : []
  const lines = project ? localApi.getApprovalLines(project.id) : []
  const voteRate = project?.vote_rate ?? 0

  const pinTotal = useMemo(() => {
    if (!project) return 0
    return items.reduce((sum, item) => sum + localApi.getPins(item.id).length, 0)
  }, [items, project])

  const approvalProgress = useMemo(() => {
    if (!lines.length) return { done: 0, total: 0 }
    const done = lines.filter((l) => l.status === 'completed').length
    return { done, total: lines.length }
  }, [lines])

  const chartSlices = useMemo(() => {
    const total = Math.max(
      1,
      items.reduce((s, i) => s + (i.vote_count ?? 0), 0)
    )
    const colors = ['#2563eb', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe']
    let acc = 0
    return items.map((item, idx) => {
      const count = item.vote_count ?? 0
      const pct = Math.round((count / total) * 100)
      const start = acc
      acc += (count / total) * 360
      return {
        id: item.id,
        title: item.title,
        count,
        pct,
        color: colors[idx % colors.length],
        start,
        end: acc,
      }
    })
  }, [items])

  const donutGradient = useMemo(() => {
    if (chartSlices.every((s) => s.count === 0)) {
      return 'conic-gradient(#e2e8f0 0deg 360deg)'
    }
    const parts = chartSlices.map((s) => `${s.color} ${s.start}deg ${s.end}deg`)
    return `conic-gradient(${parts.join(', ')})`
  }, [chartSlices])

  if (!project || !user) return null

  const toggle = (key: string) => {
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  }

  const periodLabel = (() => {
    const start = new Date(project.created_at)
    const end = new Date(project.deadline)
    const fmt = (d: Date) =>
      `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
    return `${fmt(start)} – ${fmt(end)}`
  })()

  const buildReportHtml = () => {
    let body = `<h1>${project.title}</h1><p>작성일: ${new Date().toLocaleDateString('ko-KR')}</p>`
    if (selected.includes('votes')) {
      body += `<h2>투표 결과</h2><ul>`
      for (const item of items) {
        body += `<li>${item.title}: ${item.vote_count ?? 0}표 (${item.vote_rate ?? 0}%) 점${item.avg_score ?? 0}</li>`
      }
      body += `</ul><p>총 투표: ${votes.length}표</p>`
    }
    if (selected.includes('ai') && analysis) {
      body += `<h2>AI 분석</h2><p>${analysis.overall_summary}</p>`
    }
    if (selected.includes('pins')) {
      body += `<h2>핀 댓글 요약</h2><ul>`
      for (const item of items) {
        body += `<li>${item.title}: ${localApi.getPins(item.id).length}개</li>`
      }
      body += '</ul>'
    }
    if (selected.includes('approval')) {
      body += `<h2>승인 이력</h2><ul>`
      for (const line of lines) {
        for (const a of line.actions ?? []) {
          body += `<li>${line.step_name}: ${a.action}</li>`
        }
      }
      body += '</ul>'
    }
    if (selected.includes('members')) {
      body += `<h2>참여자 정보</h2><p>${project.member_count ?? 0}명</p>`
    }
    return `<!DOCTYPE html><html><head><title>${project.title} 보고서</title>
      <style>body{font-family:sans-serif;padding:40px;max-width:800px;margin:auto}h1{color:#2563eb}</style>
      </head><body>${body}</body></html>`
  }

  const generatePdf = () => {
    if (voteRate < 50) toast.warning('투표율이 50% 미만입니다. 그래도 보고서를 생성할까요?')
    setGenerating(true)
    setTimeout(() => {
      const w = window.open('', '_blank')
      if (w) {
        w.document.write(buildReportHtml())
        w.document.close()
        w.print()
      }
      toast.success('보고서가 생성되었습니다')
      setGenerating(false)
    }, 400)
  }

  const shareLabel =
    shareMode === 'link-pdf' ? '링크 + PDF' : shareMode === 'link' ? '링크만' : 'PDF만'

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col">
      <ProjectHeader project={project} />
      <ProjectLNB project={project} isAdmin={user.role === 'admin'} />

      <div className="grid gap-5 p-4 sm:gap-6 sm:p-6 lg:grid-cols-2">
        {/* Left: include options */}
        <section className="flex flex-col rounded-2xl border border-border bg-surface-raised p-5 shadow-[var(--shadow-card)] sm:p-6">
          <div className="mb-5">
            <h2 className="text-base font-bold text-ink">포함 항목</h2>
            <p className="mt-1 text-sm text-ink-muted">보고서에 포함할 항목을 선택하세요</p>
          </div>

          <ul className="flex flex-1 flex-col gap-2">
            {OPTIONS.map((o) => {
              const on = selected.includes(o.key)
              return (
                <li key={o.key}>
                  <label
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 transition ${
                      on
                        ? 'border-accent/40 bg-accent-soft/60'
                        : 'border-border bg-surface hover:border-accent/25'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 accent-[var(--color-accent)]"
                      checked={on}
                      onChange={() => toggle(o.key)}
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-ink">{o.label}</span>
                      <span className="mt-0.5 block text-xs text-ink-muted">{o.desc}</span>
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>

          <div className="mt-6 space-y-3 border-t border-border pt-5">
            <Button loading={generating} onClick={generatePdf} className="w-full" size="lg">
              PDF 생성 · 미리보기
            </Button>

            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent"
                placeholder="이메일 주소"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <select
                className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
                value={shareMode}
                onChange={(e) => setShareMode(e.target.value as typeof shareMode)}
              >
                <option value="link-pdf">링크 + PDF</option>
                <option value="link">링크만</option>
                <option value="pdf">PDF만</option>
              </select>
              <Button
                onClick={() => {
                  if (!email.trim()) {
                    toast.error('이메일을 입력해주세요')
                    return
                  }
                  toast.success(`${email}에 보고서(${shareLabel}) 전송을 예약했습니다 (데모)`)
                }}
              >
                전송
              </Button>
            </div>

            <p className="text-xs leading-relaxed text-ink-muted">
              보고서는 PDF로 생성되며, 이메일 또는 링크로 공유할 수 있습니다.
            </p>
          </div>
        </section>

        {/* Right: preview */}
        <section className="flex flex-col rounded-2xl border border-border bg-surface-raised p-5 shadow-[var(--shadow-card)] sm:p-6">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-ink">미리보기</h2>
              <p className="mt-1 text-sm text-ink-muted">선택한 항목으로 보고서 미리보기를 확인하세요</p>
            </div>
            <Button size="sm" variant="secondary" onClick={generatePdf}>
              전체 미리보기
            </Button>
          </div>

          <div className="flex flex-1 flex-col gap-3 rounded-xl bg-surface p-3 sm:p-4">
            {/* Project summary card */}
            <div className="rounded-xl border border-border bg-surface-raised p-4">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold text-ink sm:text-base">{project.title}</h3>
                <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent">
                  {STATUS_LABELS[project.status]}
                </span>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-ink-muted sm:text-sm">
                <div>
                  <dt className="text-[11px] uppercase tracking-wide opacity-70">기간</dt>
                  <dd className="font-medium text-ink">{periodLabel}</dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-wide opacity-70">참여자</dt>
                  <dd className="font-medium text-ink">{project.member_count ?? 0}명</dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-wide opacity-70">작성일</dt>
                  <dd className="font-medium text-ink">
                    {new Date().toLocaleDateString('ko-KR')}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-wide opacity-70">투표율</dt>
                  <dd className="font-medium text-ink">{voteRate}%</dd>
                </div>
              </dl>
            </div>

            {selected.includes('votes') && (
              <div className="rounded-xl border border-border bg-surface-raised p-4">
                <p className="mb-3 text-sm font-semibold text-ink">투표 요약</p>
                <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
                  <div className="relative h-28 w-28 shrink-0">
                    <div
                      className="h-full w-full rounded-full"
                      style={{ background: donutGradient }}
                    />
                    <div className="absolute inset-[22%] flex flex-col items-center justify-center rounded-full bg-surface-raised">
                      <span className="text-lg font-bold text-ink">{votes.length}</span>
                      <span className="text-[10px] text-ink-muted">총 투표</span>
                    </div>
                  </div>
                  <ul className="w-full space-y-1.5 text-sm">
                    {chartSlices.map((s) => (
                      <li key={s.id} className="flex items-center justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ background: s.color }}
                          />
                          <span className="truncate text-ink">{s.title}</span>
                        </span>
                        <span className="shrink-0 tabular-nums text-ink-muted">
                          {s.count}표 · {s.pct}%
                        </span>
                      </li>
                    ))}
                    {items.length === 0 && (
                      <li className="text-ink-muted">시안이 없습니다</li>
                    )}
                  </ul>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {selected.includes('ai') && (
                <div className="rounded-xl border border-border bg-surface-raised p-3">
                  <p className="text-[11px] font-medium text-ink-muted">AI 분석</p>
                  <p className="mt-1 text-sm font-semibold text-ink">
                    {analysis ? '요약 준비됨' : '데이터 없음'}
                  </p>
                  {analysis && (
                    <p className="mt-1 line-clamp-2 text-xs text-ink-muted">
                      {analysis.overall_summary}
                    </p>
                  )}
                </div>
              )}
              {selected.includes('pins') && (
                <div className="rounded-xl border border-border bg-surface-raised p-3">
                  <p className="text-[11px] font-medium text-ink-muted">핀 댓글</p>
                  <p className="mt-1 text-sm font-semibold text-ink">{pinTotal}개 의견</p>
                </div>
              )}
              {selected.includes('approval') && (
                <div className="rounded-xl border border-border bg-surface-raised p-3">
                  <p className="text-[11px] font-medium text-ink-muted">승인 단계</p>
                  <p className="mt-1 text-sm font-semibold text-ink">
                    {approvalProgress.total
                      ? `${approvalProgress.done} / ${approvalProgress.total} 완료`
                      : '미설정'}
                  </p>
                </div>
              )}
              {selected.includes('members') && (
                <div className="rounded-xl border border-border bg-surface-raised p-3">
                  <p className="text-[11px] font-medium text-ink-muted">참여율</p>
                  <p className="mt-1 text-sm font-semibold text-ink">
                    {voteRate}% ({votes.length}/{project.member_count ?? 0}명)
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-accent/20 bg-accent-soft/70 px-4 py-3 text-xs leading-relaxed text-accent sm:text-sm">
            실제 보고서는 선택한 항목을 기준으로 PDF로 생성됩니다.
          </div>
        </section>
      </div>
    </div>
  )
}
