import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Button } from '@/components/common/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { ProjectLNB, ProjectHeader } from '@/components/layout/ProjectLayout'
import { useAuthStore } from '@/stores/authStore'
import { useProjectStore } from '@/stores/projectStore'
import { localApi } from '@/lib/localDb'
import { mockAnalyzeProject } from '@/lib/claude'
import { toast } from '@/stores/toastStore'
import type { AIAnalysis } from '@/types'

export function ProjectAnalysis() {
  const { id } = useParams<{ id: string }>()
  const user = useAuthStore((s) => s.user)
  const { currentProject, items, loadProject } = useProjectStore()
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (id) {
      loadProject(id)
      setAnalysis(localApi.getAnalysis(id))
    }
  }, [id, loadProject])

  if (!currentProject || !user) return null
  const project = currentProject
  const isAdmin = user.role === 'admin'

  const runAnalysis = async () => {
    const comments = localApi.getComments(project.id)
    const allPins = items.flatMap((item) => localApi.getPins(item.id))
    if (comments.length === 0 && allPins.length === 0) {
      toast.error("분석할 데이터가 없습니다")
      return
    }
    setLoading(true)
    try {
      const result = mockAnalyzeProject({
        title: project.title,
        items: items.map((i) => ({ id: i.id, title: i.title, keywords: i.keywords })),
        comments: comments.map((c) => ({ content: c.content, item_ids: c.item_ids })),
        pinComments: allPins.map((p) => ({
          content: p.comment?.content ?? '',
          item_id: p.item_id,
        })),
        voteSummary: items.map((item) => ({
          item_id: item.id,
          vote_count: item.vote_count ?? 0,
          avg_scores: item.avg_score ?? 0,
        })),
      })
      const saved = localApi.saveAnalysis({ project_id: project.id, ...result })
      setAnalysis(saved)
      toast.success("AI 분석이 완료되었습니다")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "분석 실패")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col">
      <ProjectHeader
        project={project}
        actions={
          isAdmin ? (
            <Button size="sm" loading={loading} onClick={runAnalysis}>
              {analysis ? "재분석" : "분석 실행"}
            </Button>
          ) : null
        }
      />
      <ProjectLNB project={project} isAdmin={isAdmin} />
      <div className="p-4 sm:p-6">
        {!analysis ? (
          <EmptyState
            title={"AI 분석을 아직 실행하지 않았습니다"}
            description={"댓글·투표 데이터를 기반으로 키워드·감성·브랜드 적합도를 분석합니다"}
            actionLabel={isAdmin ? "분석 실행" : undefined}
            onAction={isAdmin ? runAnalysis : undefined}
          />
        ) : (
          <div className="mx-auto max-w-4xl space-y-8">
            <section className="card p-5">
              <h2 className="mb-4 text-lg font-bold">{"주요 키워드"}</h2>
              <div className="space-y-2">
                {analysis.keywords.map((k) => {
                  const max = Math.max(...analysis.keywords.map((x) => x.count), 1)
                  return (
                    <div key={k.word} className="flex items-center gap-3">
                      <span className="w-24 truncate text-sm font-medium">{k.word}</span>
                      <div className="h-6 flex-1 overflow-hidden rounded bg-surface">
                        <div
                          className={`h-full rounded ${
                            k.sentiment === 'positive'
                              ? 'bg-accent'
                              : k.sentiment === 'negative'
                                ? 'bg-danger'
                                : 'bg-ink-muted'
                          }`}
                          style={{ width: `${(k.count / max) * 100}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-xs text-ink-muted">{k.count}</span>
                    </div>
                  )
                })}
              </div>
            </section>

            <section>
              <h2 className="mb-4 text-lg font-bold">{"시안별 의견 요약"}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {items.map((item) => (
                  <div key={item.id} className="card p-4">
                    <h3 className="mb-2 font-semibold">{item.title}</h3>
                    <p className="text-sm leading-relaxed text-ink-muted">
                      {analysis.item_summaries[item.id] ?? "요약 없음"}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="card p-5">
              <h2 className="mb-4 text-lg font-bold">{"감성 분석"}</h2>
              <div className="flex items-center gap-8">
                <Donut
                  positive={analysis.sentiment.positive}
                  neutral={analysis.sentiment.neutral}
                  negative={analysis.sentiment.negative}
                />
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="mr-2 inline-block h-3 w-3 rounded-full bg-accent" />
                    {"긍정"} {analysis.sentiment.positive}%
                  </p>
                  <p>
                    <span className="mr-2 inline-block h-3 w-3 rounded-full bg-ink-muted" />
                    {"중립"} {analysis.sentiment.neutral}%
                  </p>
                  <p>
                    <span className="mr-2 inline-block h-3 w-3 rounded-full bg-danger" />
                    {"부정"} {analysis.sentiment.negative}%
                  </p>
                </div>
              </div>
            </section>

            <section className="card p-5">
              <h2 className="mb-4 text-lg font-bold">{"브랜드 적합도"}</h2>
              <div className="space-y-3">
                {items.map((item) => {
                  const score = analysis.brand_fit_scores[item.id] ?? 0
                  return (
                    <div key={item.id} className="flex items-center gap-3">
                      <span className="w-28 truncate text-sm font-medium">{item.title}</span>
                      <div className="h-4 flex-1 overflow-hidden rounded-full bg-surface">
                        <div className="h-full rounded-full bg-accent" style={{ width: `${score}%` }} />
                      </div>
                      <span className="w-10 text-right text-sm font-bold text-accent">{score}</span>
                    </div>
                  )
                })}
              </div>
            </section>

            <section>
              <button className="text-sm font-semibold text-accent" onClick={() => setExpanded(!expanded)}>
                {expanded ? "원문 근거 접기" : "원문 근거 펼치기"}
              </button>
              {expanded && (
                <p className="card mt-3 p-4 text-sm leading-relaxed text-ink-muted">
                  {analysis.overall_summary}
                </p>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  )
}

function Donut({
  positive,
  neutral,
  negative,
}: {
  positive: number
  neutral: number
  negative: number
}) {
  const r = 40
  const c = 2 * Math.PI * r
  const p1 = (positive / 100) * c
  const p2 = (neutral / 100) * c
  const p3 = (negative / 100) * c
  return (
    <svg width="120" height="120" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#e5e7eb" strokeWidth="12" />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke="#2563eb"
        strokeWidth="12"
        strokeDasharray={`${p1} ${c - p1}`}
        transform="rotate(-90 50 50)"
      />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke="#6b7280"
        strokeWidth="12"
        strokeDasharray={`${p2} ${c - p2}`}
        strokeDashoffset={-p1}
        transform="rotate(-90 50 50)"
      />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke="#ef4444"
        strokeWidth="12"
        strokeDasharray={`${p3} ${c - p3}`}
        strokeDashoffset={-(p1 + p2)}
        transform="rotate(-90 50 50)"
      />
    </svg>
  )
}
