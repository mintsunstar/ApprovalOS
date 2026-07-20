import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const L = JSON.parse(fs.readFileSync(path.join(root, 'scripts/ko-ui-labels.json'), 'utf8'))

function write(rel, content) {
  const full = path.join(root, rel)
  fs.writeFileSync(full, content, 'utf8')
  const ok = /[\uAC00-\uD7A3]/.test(content)
  console.log('wrote', rel, 'hangul', ok)
}

const j = (s) => JSON.stringify(s)

// --- ProjectAnalysis ---
write(
  'src/pages/ProjectAnalysis.tsx',
  `import { useEffect, useState } from 'react'
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
      toast.error(${j(L.analysis.noData)})
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
      toast.success(${j(L.analysis.done)})
    } catch (err) {
      toast.error(err instanceof Error ? err.message : ${j(L.analysis.fail)})
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
              {analysis ? ${j(L.analysis.rerun)} : ${j(L.analysis.run)}}
            </Button>
          ) : null
        }
      />
      <ProjectLNB project={project} isAdmin={isAdmin} />
      <div className="p-4 sm:p-6">
        {!analysis ? (
          <EmptyState
            title={${j(L.analysis.emptyTitle)}}
            description={${j(L.analysis.emptyDesc)}}
            actionLabel={isAdmin ? ${j(L.analysis.run)} : undefined}
            onAction={isAdmin ? runAnalysis : undefined}
          />
        ) : (
          <div className="mx-auto max-w-4xl space-y-8">
            <section className="card p-5">
              <h2 className="mb-4 text-lg font-bold">{${j(L.analysis.keywords)}}</h2>
              <div className="space-y-2">
                {analysis.keywords.map((k) => {
                  const max = Math.max(...analysis.keywords.map((x) => x.count), 1)
                  return (
                    <div key={k.word} className="flex items-center gap-3">
                      <span className="w-24 truncate text-sm font-medium">{k.word}</span>
                      <div className="h-6 flex-1 overflow-hidden rounded bg-surface">
                        <div
                          className={\`h-full rounded \${
                            k.sentiment === 'positive'
                              ? 'bg-accent'
                              : k.sentiment === 'negative'
                                ? 'bg-danger'
                                : 'bg-ink-muted'
                          }\`}
                          style={{ width: \`\${(k.count / max) * 100}%\` }}
                        />
                      </div>
                      <span className="w-8 text-right text-xs text-ink-muted">{k.count}</span>
                    </div>
                  )
                })}
              </div>
            </section>

            <section>
              <h2 className="mb-4 text-lg font-bold">{${j(L.analysis.itemSummary)}}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {items.map((item) => (
                  <div key={item.id} className="card p-4">
                    <h3 className="mb-2 font-semibold">{item.title}</h3>
                    <p className="text-sm leading-relaxed text-ink-muted">
                      {analysis.item_summaries[item.id] ?? ${j(L.analysis.noSummary)}}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="card p-5">
              <h2 className="mb-4 text-lg font-bold">{${j(L.analysis.sentiment)}}</h2>
              <div className="flex items-center gap-8">
                <Donut
                  positive={analysis.sentiment.positive}
                  neutral={analysis.sentiment.neutral}
                  negative={analysis.sentiment.negative}
                />
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="mr-2 inline-block h-3 w-3 rounded-full bg-accent" />
                    {${j(L.analysis.positive)}} {analysis.sentiment.positive}%
                  </p>
                  <p>
                    <span className="mr-2 inline-block h-3 w-3 rounded-full bg-ink-muted" />
                    {${j(L.analysis.neutral)}} {analysis.sentiment.neutral}%
                  </p>
                  <p>
                    <span className="mr-2 inline-block h-3 w-3 rounded-full bg-danger" />
                    {${j(L.analysis.negative)}} {analysis.sentiment.negative}%
                  </p>
                </div>
              </div>
            </section>

            <section className="card p-5">
              <h2 className="mb-4 text-lg font-bold">{${j(L.analysis.brandFit)}}</h2>
              <div className="space-y-3">
                {items.map((item) => {
                  const score = analysis.brand_fit_scores[item.id] ?? 0
                  return (
                    <div key={item.id} className="flex items-center gap-3">
                      <span className="w-28 truncate text-sm font-medium">{item.title}</span>
                      <div className="h-4 flex-1 overflow-hidden rounded-full bg-surface">
                        <div className="h-full rounded-full bg-accent" style={{ width: \`\${score}%\` }} />
                      </div>
                      <span className="w-10 text-right text-sm font-bold text-accent">{score}</span>
                    </div>
                  )
                })}
              </div>
            </section>

            <section>
              <button className="text-sm font-semibold text-accent" onClick={() => setExpanded(!expanded)}>
                {expanded ? ${j(L.analysis.collapse)} : ${j(L.analysis.expand)}}
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
        strokeDasharray={\`\${p1} \${c - p1}\`}
        transform="rotate(-90 50 50)"
      />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke="#6b7280"
        strokeWidth="12"
        strokeDasharray={\`\${p2} \${c - p2}\`}
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
        strokeDasharray={\`\${p3} \${c - p3}\`}
        strokeDashoffset={-(p1 + p2)}
        transform="rotate(-90 50 50)"
      />
    </svg>
  )
}
`
)

// --- ProjectComments ---
write(
  'src/pages/ProjectComments.tsx',
  `import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Button } from '@/components/common/Button'
import { Textarea } from '@/components/common/Input'
import { EmptyState } from '@/components/common/EmptyState'
import { ProjectLNB, ProjectHeader } from '@/components/layout/ProjectLayout'
import { useAuthStore } from '@/stores/authStore'
import { useProjectStore } from '@/stores/projectStore'
import { localApi } from '@/lib/localDb'
import { toast } from '@/stores/toastStore'
import type { Comment, PinComment } from '@/types'

type Tab = 'all' | 'pin' | 'item'
type Sort = 'latest' | 'likes'

export function ProjectComments() {
  const { id } = useParams<{ id: string }>()
  const user = useAuthStore((s) => s.user)
  const { currentProject, items, loadProject } = useProjectStore()
  const [tab, setTab] = useState<Tab>('all')
  const [sort, setSort] = useState<Sort>('latest')
  const [comments, setComments] = useState<Comment[]>([])
  const [pins, setPins] = useState<(PinComment & { itemTitle?: string })[]>([])
  const [content, setContent] = useState('')
  const [taggedItems, setTaggedItems] = useState<string[]>([])
  const [filterItem, setFilterItem] = useState<string>('all')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')

  const refresh = () => {
    if (!id) return
    setComments(localApi.getComments(id))
    const allPins: (PinComment & { itemTitle?: string })[] = []
    for (const item of localApi.getItems(id)) {
      for (const pin of localApi.getPins(item.id)) {
        allPins.push({ ...pin, itemTitle: item.title })
      }
    }
    setPins(allPins)
  }

  useEffect(() => {
    if (id) {
      loadProject(id)
      refresh()
    }
  }, [id, loadProject])

  const filtered = useMemo(() => {
    let list = comments.filter((c) => c.type === 'general')
    if (tab === 'item' && filterItem !== 'all') {
      list = list.filter((c) => c.item_ids.includes(filterItem))
    }
    if (sort === 'likes') list = [...list].sort((a, b) => b.like_count - a.like_count)
    return list
  }, [comments, tab, filterItem, sort])

  if (!currentProject || !user) return null
  const project = currentProject

  const submitComment = (parentId: string | null, text: string) => {
    if (!text.trim()) {
      toast.error(${j(L.comments.emptyContent)})
      return
    }
    localApi.createComment({
      project_id: project.id,
      user_id: user.id,
      content: text.trim(),
      type: 'general',
      item_ids: parentId ? [] : taggedItems,
      parent_id: parentId,
    })
    toast.success(${j(L.comments.created)})
    setContent('')
    setReplyContent('')
    setReplyTo(null)
    setTaggedItems([])
    refresh()
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col">
      <ProjectHeader project={project} />
      <ProjectLNB project={project} isAdmin={user.role === 'admin'} />
      <div className="mx-auto w-full max-w-3xl p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 rounded-xl border border-border bg-surface-raised p-1">
            {(
              [
                ['all', ${j(L.comments.tabAll)}],
                ['pin', ${j(L.comments.tabPin)}],
                ['item', ${j(L.comments.tabItem)}],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={\`rounded-lg px-3 py-1.5 text-sm font-medium \${
                  tab === k ? 'bg-accent text-white' : 'text-ink-muted'
                }\`}
              >
                {label}
              </button>
            ))}
          </div>
          {tab !== 'pin' && (
            <select
              className="rounded-lg border border-border bg-surface-raised px-3 py-1.5 text-sm"
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
            >
              <option value="latest">{${j(L.comments.sortLatest)}}</option>
              <option value="likes">{${j(L.comments.sortLikes)}}</option>
            </select>
          )}
        </div>

        {tab === 'item' && (
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              className={\`rounded-full px-3 py-1 text-xs font-medium \${
                filterItem === 'all' ? 'bg-accent text-white' : 'bg-surface text-ink-muted'
              }\`}
              onClick={() => setFilterItem('all')}
            >
              {${j(L.comments.all)}}
            </button>
            {items.map((item) => (
              <button
                key={item.id}
                className={\`rounded-full px-3 py-1 text-xs font-medium \${
                  filterItem === item.id ? 'bg-accent text-white' : 'bg-surface text-ink-muted'
                }\`}
                onClick={() => setFilterItem(item.id)}
              >
                {item.title}
              </button>
            ))}
          </div>
        )}

        {tab !== 'pin' && (
          <div className="card mb-6 p-4">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={${j(L.comments.placeholder)}}
              rows={3}
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={\`rounded-full px-2.5 py-0.5 text-xs \${
                    taggedItems.includes(item.id)
                      ? 'bg-accent-soft text-accent'
                      : 'bg-surface text-ink-muted'
                  }\`}
                  onClick={() =>
                    setTaggedItems((prev) =>
                      prev.includes(item.id) ? prev.filter((x) => x !== item.id) : [...prev, item.id]
                    )
                  }
                >
                  #{item.title}
                </button>
              ))}
            </div>
            <div className="mt-3 flex justify-end">
              <Button size="sm" onClick={() => submitComment(null, content)}>
                {${j(L.comments.submit)}}
              </Button>
            </div>
          </div>
        )}

        {tab === 'pin' ? (
          pins.length === 0 ? (
            <EmptyState
              title={${j(L.comments.pinEmptyTitle)}}
              description={${j(L.comments.pinEmptyDesc)}}
            />
          ) : (
            <div className="space-y-3">
              {Object.entries(
                pins.reduce<Record<string, typeof pins>>((acc, pin) => {
                  const key = pin.itemTitle ?? pin.item_id
                  if (!acc[key]) acc[key] = []
                  acc[key].push(pin)
                  return acc
                }, {})
              ).map(([itemTitle, group]) => (
                <div key={itemTitle} className="card p-4">
                  <h3 className="mb-3 font-semibold">{itemTitle}</h3>
                  {group.map((pin) => (
                    <div key={pin.id} className="mb-3 flex gap-3 last:mb-0">
                      <span
                        className={\`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white \${
                          pin.is_resolved ? 'bg-ink-muted' : 'bg-accent'
                        }\`}
                      >
                        {pin.pin_number}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm">{pin.comment?.content}</p>
                        <Link
                          to={\`/projects/\${project.id}/items/\${pin.item_id}\`}
                          className="mt-1 inline-block text-xs font-medium text-accent hover:underline"
                        >
                          {${j(L.comments.goDetail)}}
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )
        ) : filtered.length === 0 ? (
          <EmptyState
            title={${j(L.comments.commentEmptyTitle)}}
            description={${j(L.comments.commentEmptyDesc)}}
          />
        ) : (
          <ul className="space-y-4">
            {filtered.map((c) => (
              <li key={c.id} className="card p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs text-white">
                    {c.user?.name?.charAt(0) ?? '?'}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{c.user?.name}</p>
                    <p className="text-xs text-ink-muted">
                      {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: ko })}
                    </p>
                  </div>
                </div>
                <p className="text-sm leading-relaxed">{c.content}</p>
                {c.item_ids.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {c.item_ids.map((iid) => {
                      const item = items.find((i) => i.id === iid)
                      return (
                        <span key={iid} className="rounded bg-surface px-2 py-0.5 text-xs text-ink-muted">
                          #{item?.title ?? iid}
                        </span>
                      )
                    })}
                  </div>
                )}
                <div className="mt-3 flex gap-3">
                  <button
                    className={\`text-xs \${c.liked_by_me ? 'text-accent' : 'text-ink-muted'} \${
                      c.user_id === user.id ? 'opacity-40' : ''
                    }\`}
                    disabled={c.user_id === user.id}
                    onClick={() => {
                      localApi.toggleLike(c.id, user.id)
                      refresh()
                    }}
                  >
                    {'\\u2665'} {c.like_count}
                  </button>
                  <button className="text-xs text-ink-muted" onClick={() => setReplyTo(c.id)}>
                    {${j(L.comments.reply)}}
                  </button>
                </div>
                {c.replies?.map((r) => (
                  <div key={r.id} className="ml-6 mt-3 border-l-2 border-accent/30 pl-4">
                    <p className="text-xs font-medium">{r.user?.name}</p>
                    <p className="text-sm">{r.content}</p>
                  </div>
                ))}
                {replyTo === c.id && (
                  <div className="mt-3 flex gap-2">
                    <Textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      rows={2}
                      className="flex-1"
                    />
                    <Button size="sm" onClick={() => submitComment(c.id, replyContent)}>
                      {${j(L.comments.submit)}}
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
`
)

console.log('partial done - continuing in part 2')
