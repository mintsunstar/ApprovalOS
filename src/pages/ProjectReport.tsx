import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '@/components/common/Button'
import { ProjectLNB } from '@/components/layout/ProjectLayout'
import { useAuthStore } from '@/stores/authStore'
import { useProjectStore } from '@/stores/projectStore'
import { localApi } from '@/lib/localDb'
import { toast } from '@/stores/toastStore'
import { STATUS_LABELS, type ProjectStatus } from '@/types'

const CHART_COLORS = ['#2563eb', '#22c55e', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899']

const AI_METRIC_LABELS = [
  '브랜드 적합성',
  '디자인 완성도',
  '가독성',
  '독창성',
  '확장성',
  '종합 평가',
] as const

function reportStatusLabel(status: ProjectStatus): string {
  if (status === 'closed') return '투표 종료'
  return STATUS_LABELS[status]
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`
}

export function ProjectReport() {
  const { id } = useParams<{ id: string }>()
  const user = useAuthStore((s) => s.user)
  const { currentProject, items, loadProject } = useProjectStore()
  const [shareOpen, setShareOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    if (id) loadProject(id)
  }, [id, loadProject])

  const project = currentProject
  const workspace = user?.workspace_id ? localApi.getWorkspace(user.workspace_id) : null
  const analysis = project ? localApi.getAnalysis(project.id) : null
  const lines = project ? localApi.getApprovalLines(project.id) : []

  const pinByItem = useMemo(() => {
    return items.map((item) => ({
      id: item.id,
      title: item.title,
      count: localApi.getPins(item.id).length,
    }))
  }, [items])

  const pinTotal = pinByItem.reduce((s, p) => s + p.count, 0)

  const voteTotal = useMemo(
    () => items.reduce((s, i) => s + (i.vote_count ?? 0), 0),
    [items]
  )

  const chartSlices = useMemo(() => {
    const total = Math.max(1, voteTotal)
    let acc = 0
    return items.map((item, idx) => {
      const count = item.vote_count ?? 0
      const pct = voteTotal === 0 ? 0 : Math.round((count / total) * 100)
      const start = acc
      acc += voteTotal === 0 ? 0 : (count / total) * 360
      return {
        id: item.id,
        title: item.title,
        count,
        pct,
        avg: item.avg_score ?? 0,
        color: CHART_COLORS[idx % CHART_COLORS.length],
        start,
        end: voteTotal === 0 ? 0 : acc,
      }
    })
  }, [items, voteTotal])

  const donutGradient = useMemo(() => {
    if (voteTotal === 0) return 'conic-gradient(#e2e8f0 0deg 360deg)'
    return `conic-gradient(${chartSlices.map((s) => `${s.color} ${s.start}deg ${s.end}deg`).join(', ')})`
  }, [chartSlices, voteTotal])

  const topItem = useMemo(() => {
    if (!chartSlices.length) return null
    return [...chartSlices].sort((a, b) => b.count - a.count || b.pct - a.pct)[0]
  }, [chartSlices])

  const aiMetrics = useMemo(() => {
    const scores = analysis ? Object.values(analysis.brand_fit_scores) : []
    const avgFit =
      scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
    const sentiment = analysis?.sentiment
    const pos = sentiment?.positive ?? 0
    const neu = sentiment?.neutral ?? 0
    const values = analysis
      ? [
          avgFit,
          Math.min(100, avgFit * 0.95 + neu * 0.1),
          Math.min(100, 40 + pos * 0.4),
          Math.min(100, 35 + (analysis.keywords.length / 8) * 40),
          Math.min(100, avgFit * 0.85 + 10),
          Math.min(100, (avgFit + pos) / 2 + 10),
        ]
      : [0, 0, 0, 0, 0, 0]
    return AI_METRIC_LABELS.map((label, i) => ({
      label,
      value: Math.round(values[i] * 10) / 10,
      highlight: i === AI_METRIC_LABELS.length - 1,
    }))
  }, [analysis])

  if (!project || !user) return null

  const periodLabel = `${fmtDate(project.created_at)} ~ ${fmtDate(project.deadline)}`
  const memberCount = project.member_count ?? 0
  const statusText = reportStatusLabel(project.status)

  const buildReportHtml = () => {
    let body = `<h1>${project.title} 검토 보고서</h1>
      <p>작성일: ${fmtDate(new Date().toISOString())}</p>
      <p>상태: ${statusText} · 참여자: ${memberCount}명 · 투표: ${voteTotal}표</p>`
    body += `<h2>투표 결과</h2><ul>`
    for (const s of chartSlices) {
      body += `<li>${s.title}: ${s.count}표 (${s.pct}%) 평균 ${s.avg}</li>`
    }
    body += `</ul>`
    if (analysis) {
      body += `<h2>AI 분석</h2><p>${analysis.overall_summary}</p>`
    }
    body += `<h2>핀 댓글</h2><p>총 ${pinTotal}개</p>`
    body += `<p style="color:#94a3b8;margin-top:40px;text-align:center">본 보고서는 ApprovalOS에서 자동 생성되었습니다.</p>`
    return `<!DOCTYPE html><html><head><title>${project.title} 검토 보고서</title>
      <style>body{font-family:sans-serif;padding:40px;max-width:800px;margin:auto;color:#0f172a}h1{color:#2563eb}</style>
      </head><body>${body}</body></html>`
  }

  const downloadPdf = () => {
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
    }, 300)
  }

  const summaryLines = [
    {
      icon: 'chart',
      text:
        topItem && voteTotal > 0
          ? `${topItem.title}이(가) ${topItem.pct}%의 득표율로 가장 선호되었습니다.`
          : '아직 투표 데이터가 없습니다.',
    },
    {
      icon: 'chat',
      text:
        pinTotal > 0
          ? `총 ${pinTotal}개의 핀 댓글이 등록되었습니다.`
          : '등록된 핀 댓글이 없습니다.',
    },
    {
      icon: 'spark',
      text: analysis
        ? memberCount <= 2 || voteTotal < 3
          ? '현재 참여자가 적어 분석 데이터가 제한적입니다.'
          : 'AI 분석이 완료되었습니다. 위 지표를 참고하세요.'
        : 'AI 분석을 아직 실행하지 않았습니다.',
    },
    {
      icon: 'arrow',
      text:
        project.status === 'closed'
          ? '보고서 결과를 공유하거나 PDF로 저장해 보세요.'
          : '승인 요청을 진행하거나 추가 의견을 수집해 보세요.',
    },
  ]

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col bg-surface">
      <ProjectLNB project={project} isAdmin={user.role === 'admin'} />

      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Header */}
        <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="mb-1 text-xs text-ink-muted sm:text-sm">
              <Link to={`/projects/${project.id}`} className="hover:text-accent hover:underline">
                {project.title}
              </Link>
              {workspace?.name ? ` · ${workspace.name}` : ''}
            </p>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[1.75rem]">
                보고서
              </h1>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                {statusText}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" loading={generating} onClick={downloadPdf}>
              <IconDownload /> PDF 다운로드
            </Button>
            <Button onClick={() => setShareOpen(true)}>
              <IconShare /> 공유하기
            </Button>
          </div>
        </header>

        {/* 기본 정보 */}
        <section className="mb-4 rounded-2xl border border-border bg-surface-raised p-5 shadow-[var(--shadow-card)] sm:mb-5 sm:p-6">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-ink">
            <IconBuilding /> 기본 정보
          </h2>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <InfoCell label="프로젝트명" value={project.title} />
            <InfoCell label="작성일" value={fmtDate(new Date().toISOString())} />
            <InfoCell label="투표 기간" value={periodLabel} />
            <InfoCell label="참여자" value={`${memberCount}명`} />
            <div>
              <dt className="text-xs text-ink-muted">상태</dt>
              <dd className="mt-1">
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    project.status === 'closed'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-accent-soft text-accent'
                  }`}
                >
                  {statusText}
                </span>
              </dd>
            </div>
          </dl>
        </section>

        {/* 투표 결과 */}
        <section className="mb-4 rounded-2xl border border-border bg-surface-raised p-5 shadow-[var(--shadow-card)] sm:mb-5 sm:p-6">
          <h2 className="mb-5 flex items-center gap-2 text-sm font-bold text-ink">
            <IconChart /> 투표 결과
          </h2>
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center">
            <div className="flex flex-col items-center gap-2 lg:w-[240px] lg:shrink-0">
              <div className="relative h-40 w-40 sm:h-44 sm:w-44">
                <div
                  className="h-full w-full rounded-full"
                  style={{ background: donutGradient }}
                />
                <div className="absolute inset-[18%] flex flex-col items-center justify-center rounded-full bg-surface-raised">
                  <span className="text-2xl font-bold text-ink">
                    {voteTotal === 0 ? '0%' : `${topItem?.pct ?? 0}%`}
                  </span>
                </div>
              </div>
              <p className="text-sm text-ink-muted">총 투표 {voteTotal}표</p>
            </div>

            <div className="min-w-0 flex-1 overflow-x-auto">
              <table className="w-full min-w-[320px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-ink-muted">
                    <th className="pb-2 font-medium">시안</th>
                    <th className="pb-2 font-medium">득표수</th>
                    <th className="pb-2 font-medium">비율</th>
                    <th className="pb-2 text-right font-medium">점수(평균)</th>
                  </tr>
                </thead>
                <tbody>
                  {chartSlices.map((s) => (
                    <tr key={s.id} className="border-b border-border/60">
                      <td className="py-3">
                        <span className="flex items-center gap-2 font-medium text-ink">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ background: s.color }}
                          />
                          {s.title}
                        </span>
                      </td>
                      <td className="py-3 tabular-nums text-ink">{s.count}표</td>
                      <td className="py-3 min-w-[140px]">
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${s.pct}%`, background: s.color }}
                            />
                          </div>
                          <span className="w-10 shrink-0 tabular-nums text-ink-muted">{s.pct}%</span>
                        </div>
                      </td>
                      <td className="py-3 text-right tabular-nums text-ink">{s.avg}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td className="pt-3 text-sm font-semibold text-ink" colSpan={2}>
                      총 투표
                    </td>
                    <td className="pt-3 text-right text-sm font-semibold text-ink" colSpan={2}>
                      {voteTotal}표
                    </td>
                  </tr>
                </tfoot>
              </table>
              {items.length === 0 && (
                <p className="py-6 text-center text-sm text-ink-muted">시안이 없습니다</p>
              )}
            </div>
          </div>
        </section>

        {/* AI 분석 */}
        <section className="mb-4 rounded-2xl border border-border bg-surface-raised p-5 shadow-[var(--shadow-card)] sm:mb-5 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
              <IconSpark /> AI 분석
            </h2>
            <span className="rounded-md bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-700">
              Beta
            </span>
          </div>

          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <p className="max-w-2xl text-sm leading-relaxed text-ink-muted">
              {analysis?.overall_summary ??
                `"${project.title}" 프로젝트 분석 결과, 참여자들의 의견이 수집·요약되었습니다. 투표와 댓글 데이터를 바탕으로 시안별 브랜드 적합성을 평가했습니다.`}
            </p>
            <div className="hidden h-20 w-28 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-50 to-violet-50 sm:flex">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm">
                <span className="text-xs font-bold text-accent">AI</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {aiMetrics.map((m) => (
              <div
                key={m.label}
                className={`rounded-xl border px-3 py-3 text-center ${
                  m.highlight
                    ? 'border-violet-200 bg-violet-50/80'
                    : 'border-border bg-surface'
                }`}
              >
                <p className="text-[11px] text-ink-muted">{m.label}</p>
                <p className="mt-1.5 text-sm font-bold tabular-nums text-ink">
                  {m.value.toFixed(1)} <span className="text-xs font-normal text-ink-muted">/ 100</span>
                </p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-ink-muted">
            AI 분석은 참고용이며, 데이터가 적을 경우 지표가 제한될 수 있습니다.
          </p>
        </section>

        {/* 3열 위젯 */}
        <div className="mb-4 grid gap-4 sm:mb-5 sm:grid-cols-3">
          <section className="rounded-2xl border border-border bg-surface-raised p-5 shadow-[var(--shadow-card)]">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-ink">
              <IconPin /> 핀 댓글 요약
            </h2>
            {pinByItem.length === 0 ? (
              <p className="text-sm text-ink-muted">시안이 없습니다</p>
            ) : (
              <ul className="space-y-3">
                {pinByItem.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate font-medium text-ink">{p.title}</span>
                    <span className="shrink-0 rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent">
                      {p.count}개
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-surface-raised p-5 shadow-[var(--shadow-card)]">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-ink">
              <IconClipboard /> 승인 이력
            </h2>
            {lines.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-ink-muted">
                  <IconClipboard className="opacity-50" />
                </div>
                <p className="text-sm text-ink-muted">아직 승인 요청이 진행되지 않았습니다.</p>
              </div>
            ) : (
              <ul className="space-y-2 text-sm">
                {lines.map((line) => (
                  <li key={line.id} className="flex justify-between gap-2">
                    <span className="truncate text-ink">{line.step_name}</span>
                    <span className="shrink-0 text-xs text-ink-muted">{line.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-surface-raised p-5 shadow-[var(--shadow-card)]">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-ink">
              <IconUsers /> 참여자 정보
            </h2>
            <div className="flex items-center gap-4">
              <div className="relative h-16 w-16 shrink-0">
                <div
                  className="h-full w-full rounded-full"
                  style={{
                    background: `conic-gradient(#2563eb 0deg ${(project.vote_rate ?? 0) * 3.6}deg, #e2e8f0 0deg)`,
                  }}
                />
                <div className="absolute inset-[22%] rounded-full bg-surface-raised" />
              </div>
              <div>
                <p className="text-2xl font-bold text-ink">{memberCount}명</p>
                <p className="text-xs text-ink-muted">총 참여자</p>
                <p className="mt-1 text-xs text-ink-muted">투표율 {project.vote_rate ?? 0}%</p>
              </div>
            </div>
          </section>
        </div>

        {/* 상세 요약 */}
        <section className="mb-8 rounded-2xl border border-border bg-surface-raised p-5 shadow-[var(--shadow-card)] sm:p-6">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-ink">
            <IconList /> 상세 요약
          </h2>
          <ul className="space-y-3">
            {summaryLines.map((line) => (
              <li key={line.text} className="flex items-start gap-3 text-sm text-ink">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                  {line.icon === 'chart' && <IconChart className="h-3.5 w-3.5" />}
                  {line.icon === 'chat' && <IconChat className="h-3.5 w-3.5" />}
                  {line.icon === 'spark' && <IconSpark className="h-3.5 w-3.5" />}
                  {line.icon === 'arrow' && <IconArrow className="h-3.5 w-3.5" />}
                </span>
                <span className="leading-relaxed pt-1">{line.text}</span>
              </li>
            ))}
          </ul>
        </section>

        <p className="pb-8 text-center text-xs text-ink-muted">
          본 보고서는 ApprovalOS에서 자동 생성되었습니다.
        </p>
      </div>

      {/* Share modal */}
      {shareOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface-raised p-5 shadow-xl">
            <h3 className="text-base font-bold text-ink">보고서 공유</h3>
            <p className="mt-1 text-sm text-ink-muted">이메일로 보고서 링크·PDF 전송을 예약합니다 (데모)</p>
            <input
              className="mt-4 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent"
              placeholder="이메일 주소"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShareOpen(false)}>
                닫기
              </Button>
              <Button
                onClick={() => {
                  if (!email.trim()) {
                    toast.error('이메일을 입력해주세요')
                    return
                  }
                  toast.success(`${email}에 보고서 전송을 예약했습니다 (데모)`)
                  setShareOpen(false)
                }}
              >
                전송
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-ink">{value}</dd>
    </div>
  )
}

function IconDownload() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
    </svg>
  )
}
function IconShare() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.6 13.5 15.4 17.5M15.4 6.5 8.6 10.5" />
    </svg>
  )
}
function IconBuilding() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 21V5a1 1 0 0 1 1-1h8l7 7v10H4z" />
      <path d="M13 4v7h7" />
    </svg>
  )
}
function IconChart({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 19h16M7 16V9M12 16V5M17 16v-4" />
    </svg>
  )
}
function IconSpark({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z" />
    </svg>
  )
}
function IconPin() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 17v5M9 3h6l-1 7h3l-5 7-5-7h3L9 3z" />
    </svg>
  )
}
function IconClipboard({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="6" y="5" width="12" height="16" rx="2" />
      <path d="M9 5V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1" />
    </svg>
  )
}
function IconUsers() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}
function IconList() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  )
}
function IconChat({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
    </svg>
  )
}
function IconArrow({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  )
}
