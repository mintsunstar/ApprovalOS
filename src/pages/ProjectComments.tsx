import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Button } from '@/components/common/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { ProjectLNB, ProjectHeader } from '@/components/layout/ProjectLayout'
import { useAuthStore } from '@/stores/authStore'
import { useProjectStore } from '@/stores/projectStore'
import { localApi } from '@/lib/localDb'
import { toast } from '@/stores/toastStore'
import type { Comment, PinComment } from '@/types'
import { DEFAULT_NOTIFICATION_PREFS } from '@/types'

type Tab = 'all' | 'pin' | 'item'
type Sort = 'latest' | 'likes'

type FeedItem =
  | { kind: 'comment'; at: string; likes: number; data: Comment }
  | {
      kind: 'pin'
      at: string
      likes: number
      data: PinComment & { itemTitle?: string }
    }

const ITEM_COLORS = ['#2563eb', '#22c55e', '#f59e0b', '#8b5cf6', '#06b6d4']

function extractKeywords(texts: string[], limit = 8): { word: string; count: number }[] {
  const counts = new Map<string, number>()
  const stop = new Set(['그리고', '하지만', '에서', '으로', '입니다', '합니다', '있는', '없는', '너무', '매우'])
  for (const text of texts) {
    const words = text
      .replace(/[^\p{L}\p{N}\s#]/gu, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 2 && !stop.has(w) && !w.startsWith('#'))
    for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word, count]) => ({ word, count }))
}

export function ProjectComments() {
  const { id } = useParams<{ id: string }>()
  const { user, refreshUser } = useAuthStore()
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

  const generalRoots = useMemo(
    () => comments.filter((c) => c.type === 'general' && !c.parent_id),
    [comments]
  )

  const pinCount = pins.length
  const commentCount = generalRoots.length
  const totalFeedCount = commentCount + pinCount

  const participants = useMemo(() => {
    const ids = new Set<string>()
    for (const c of comments) ids.add(c.user_id)
    for (const p of pins) {
      if (p.comment?.user_id) ids.add(p.comment.user_id)
    }
    return ids.size
  }, [comments, pins])

  const commentsPerItem = useMemo(() => {
    return items.map((item, idx) => {
      const general = generalRoots.filter((c) => c.item_ids.includes(item.id)).length
      const pinN = pins.filter((p) => p.item_id === item.id).length
      return {
        id: item.id,
        title: item.title,
        count: general + pinN,
        color: ITEM_COLORS[idx % ITEM_COLORS.length],
      }
    })
  }, [items, generalRoots, pins])

  const maxItemCount = Math.max(1, ...commentsPerItem.map((x) => x.count))

  const keywords = useMemo(() => {
    const texts = [
      ...generalRoots.map((c) => c.content),
      ...pins.map((p) => p.comment?.content ?? ''),
    ]
    return extractKeywords(texts)
  }, [generalRoots, pins])

  const feed = useMemo(() => {
    const itemsFeed: FeedItem[] = []

    if (tab === 'pin') {
      for (const p of pins) {
        itemsFeed.push({
          kind: 'pin',
          at: p.created_at,
          likes: p.comment?.like_count ?? 0,
          data: p,
        })
      }
    } else if (tab === 'item') {
      let list = generalRoots
      if (filterItem !== 'all') {
        list = list.filter((c) => c.item_ids.includes(filterItem))
      }
      for (const c of list) {
        itemsFeed.push({ kind: 'comment', at: c.created_at, likes: c.like_count, data: c })
      }
      const pinList =
        filterItem === 'all' ? pins : pins.filter((p) => p.item_id === filterItem)
      for (const p of pinList) {
        itemsFeed.push({
          kind: 'pin',
          at: p.created_at,
          likes: p.comment?.like_count ?? 0,
          data: p,
        })
      }
    } else {
      for (const c of generalRoots) {
        itemsFeed.push({ kind: 'comment', at: c.created_at, likes: c.like_count, data: c })
      }
      for (const p of pins) {
        itemsFeed.push({
          kind: 'pin',
          at: p.created_at,
          likes: p.comment?.like_count ?? 0,
          data: p,
        })
      }
    }

    if (sort === 'likes') {
      itemsFeed.sort((a, b) => b.likes - a.likes || b.at.localeCompare(a.at))
    } else {
      itemsFeed.sort((a, b) => b.at.localeCompare(a.at))
    }
    return itemsFeed
  }, [tab, sort, generalRoots, pins, filterItem])

  if (!currentProject || !user) return null
  const project = currentProject
  const prefs = { ...DEFAULT_NOTIFICATION_PREFS, ...user.notification_prefs }
  const notifyOn = prefs.new_comment

  const submitComment = (parentId: string | null, text: string) => {
    if (!text.trim()) {
      toast.error('댓글 내용을 입력해주세요')
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
    toast.success('댓글이 등록되었습니다')
    setContent('')
    setReplyContent('')
    setReplyTo(null)
    setTaggedItems([])
    refresh()
  }

  const toggleNotify = () => {
    const next = { ...prefs, new_comment: !notifyOn }
    localApi.updateNotificationPrefs(user.id, next)
    refreshUser()
    toast.success(next.new_comment ? '새 댓글 알림이 켜졌습니다' : '새 댓글 알림이 꺼졌습니다')
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col bg-surface">
      <ProjectHeader project={project} />
      <ProjectLNB project={project} isAdmin={user.role === 'admin'} />

      <div className="mx-auto grid w-full max-w-6xl gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        {/* Main */}
        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <FilterChip
                active={tab === 'all'}
                onClick={() => setTab('all')}
                label={`전체 ${totalFeedCount}`}
              />
              <FilterChip
                active={tab === 'pin'}
                onClick={() => setTab('pin')}
                label={`핀 댓글 ${pinCount}`}
              />
              <div className="relative">
                <select
                  className={`appearance-none rounded-full border px-3 py-1.5 pr-7 text-sm font-medium outline-none ${
                    tab === 'item'
                      ? 'border-accent bg-accent text-white'
                      : 'border-border bg-surface-raised text-ink-muted'
                  }`}
                  value={tab === 'item' ? filterItem : ''}
                  onChange={(e) => {
                    setTab('item')
                    setFilterItem(e.target.value || 'all')
                  }}
                  onClick={() => setTab('item')}
                >
                  <option value="all">시안별</option>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <select
              className="rounded-xl border border-border bg-surface-raised px-3 py-1.5 text-sm text-ink"
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
            >
              <option value="latest">최신순</option>
              <option value="likes">좋아요순</option>
            </select>
          </div>

          {tab !== 'pin' && (
            <div className="rounded-2xl border border-border bg-surface-raised p-4 shadow-[var(--shadow-card)]">
              <div className="flex gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white">
                  {user.name.charAt(0)}
                </span>
                <div className="min-w-0 flex-1">
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="의견을 남겨주세요"
                    rows={3}
                    className="w-full resize-none rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                  />
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex gap-1 text-ink-muted" title="데모에서는 미지원">
                        <ToolbarIcon kind="image" />
                        <ToolbarIcon kind="mention" />
                        <ToolbarIcon kind="emoji" />
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {items.map((item) => {
                          const on = taggedItems.includes(item.id)
                          return (
                            <button
                              key={item.id}
                              type="button"
                              className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition ${
                                on
                                  ? 'bg-accent-soft text-accent ring-1 ring-accent/30'
                                  : 'bg-surface text-ink-muted hover:bg-accent-soft/50'
                              }`}
                              onClick={() =>
                                setTaggedItems((prev) =>
                                  prev.includes(item.id)
                                    ? prev.filter((x) => x !== item.id)
                                    : [...prev, item.id]
                                )
                              }
                            >
                              #{item.title}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    <Button size="sm" onClick={() => submitComment(null, content)}>
                      댓글 등록
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {feed.length === 0 ? (
            <EmptyState
              title={tab === 'pin' ? '핀 댓글이 없습니다' : '댓글이 없습니다'}
              description={
                tab === 'pin'
                  ? '시안 상세에서 이미지에 핀을 남겨 의견을 공유하세요'
                  : '첫 의견을 남겨보세요'
              }
            />
          ) : (
            <ul className="space-y-3">
              {feed.map((item) =>
                item.kind === 'comment' ? (
                  <CommentCard
                    key={item.data.id}
                    comment={item.data}
                    items={items}
                    userId={user.id}
                    isAuthor={item.data.user_id === project.created_by}
                    replyTo={replyTo}
                    replyContent={replyContent}
                    setReplyTo={setReplyTo}
                    setReplyContent={setReplyContent}
                    onLike={() => {
                      localApi.toggleLike(item.data.id, user.id)
                      refresh()
                    }}
                    onReply={() => submitComment(item.data.id, replyContent)}
                  />
                ) : (
                  <PinCard
                    key={item.data.id}
                    pin={item.data}
                    projectId={project.id}
                    isAuthor={item.data.comment?.user_id === project.created_by}
                  />
                )
              )}
            </ul>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <section className="rounded-2xl border border-border bg-surface-raised p-4 shadow-[var(--shadow-card)]">
            <h2 className="mb-3 text-sm font-bold text-ink">댓글 요약</h2>
            <ul className="space-y-3">
              <StatRow icon="chat" label="총 댓글 수" value={`${totalFeedCount}`} />
              <StatRow icon="pin" label="핀 댓글 수" value={`${pinCount}`} />
              <StatRow icon="users" label="참여자 수" value={`${participants}`} />
            </ul>
          </section>

          <section className="rounded-2xl border border-border bg-surface-raised p-4 shadow-[var(--shadow-card)]">
            <h2 className="mb-3 text-sm font-bold text-ink">시안별 댓글 수</h2>
            {commentsPerItem.length === 0 ? (
              <p className="text-sm text-ink-muted">시안이 없습니다</p>
            ) : (
              <ul className="space-y-3">
                {commentsPerItem.map((row) => (
                  <li key={row.id}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-ink">{row.title}</span>
                      <span className="text-ink-muted">{row.count}개</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${(row.count / maxItemCount) * 100}%`,
                          background: row.color,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-surface-raised p-4 shadow-[var(--shadow-card)]">
            <h2 className="mb-3 text-sm font-bold text-ink">주요 키워드</h2>
            {keywords.length === 0 ? (
              <p className="text-sm text-ink-muted">댓글이 쌓이면 키워드가 표시됩니다</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {keywords.map((k) => (
                  <span
                    key={k.word}
                    className="rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-ink"
                  >
                    {k.word}{' '}
                    <span className="text-ink-muted">{k.count}</span>
                  </span>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-surface-raised p-4 shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-start gap-2">
                <span className="mt-0.5 text-accent">
                  <IconBell />
                </span>
                <div>
                  <p className="text-sm font-medium text-ink">알림 설정</p>
                  <p className="mt-0.5 text-xs text-ink-muted">새 댓글 알림을 받아보세요</p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={notifyOn}
                onClick={toggleNotify}
                className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                  notifyOn ? 'bg-accent' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                    notifyOn ? 'translate-x-5' : ''
                  }`}
                />
              </button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
        active
          ? 'bg-accent text-white shadow-sm'
          : 'border border-border bg-surface-raised text-ink-muted hover:text-ink'
      }`}
    >
      {label}
    </button>
  )
}

function StatRow({
  icon,
  label,
  value,
}: {
  icon: 'chat' | 'pin' | 'users'
  label: string
  value: string
}) {
  return (
    <li className="flex items-center justify-between gap-2 text-sm">
      <span className="flex items-center gap-2 text-ink-muted">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-soft text-accent">
          {icon === 'chat' && <IconChat />}
          {icon === 'pin' && <IconPin />}
          {icon === 'users' && <IconUsers />}
        </span>
        {label}
      </span>
      <span className="font-bold tabular-nums text-ink">{value}</span>
    </li>
  )
}

function CommentCard({
  comment,
  items,
  userId,
  isAuthor,
  replyTo,
  replyContent,
  setReplyTo,
  setReplyContent,
  onLike,
  onReply,
}: {
  comment: Comment
  items: { id: string; title: string }[]
  userId: string
  isAuthor: boolean
  replyTo: string | null
  replyContent: string
  setReplyTo: (id: string | null) => void
  setReplyContent: (v: string) => void
  onLike: () => void
  onReply: () => void
}) {
  return (
    <li className="rounded-2xl border border-border bg-surface-raised p-4 shadow-[var(--shadow-card)]">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white">
            {comment.user?.name?.charAt(0) ?? '?'}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="text-sm font-semibold text-ink">{comment.user?.name}</p>
              {isAuthor && (
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-ink-muted">
                  작성자
                </span>
              )}
            </div>
            <p className="text-xs text-ink-muted">
              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ko })}
            </p>
          </div>
        </div>
      </div>

      <p className="text-sm leading-relaxed text-ink">{comment.content}</p>

      {comment.item_ids.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {comment.item_ids.map((iid) => {
            const item = items.find((i) => i.id === iid)
            return (
              <span
                key={iid}
                className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent"
              >
                #{item?.title ?? iid}
              </span>
            )
          })}
        </div>
      )}

      <div className="mt-3 flex items-center gap-4">
        <button
          type="button"
          className={`flex items-center gap-1 text-xs font-medium ${
            comment.liked_by_me ? 'text-accent' : 'text-ink-muted'
          } ${comment.user_id === userId ? 'opacity-40' : ''}`}
          disabled={comment.user_id === userId}
          onClick={onLike}
        >
          <IconHeart filled={!!comment.liked_by_me} /> {comment.like_count}
        </button>
        <button
          type="button"
          className="text-xs font-medium text-ink-muted hover:text-ink"
          onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
        >
          답글 {comment.replies?.length ?? 0}
        </button>
      </div>

      {comment.replies?.map((r) => (
        <div key={r.id} className="ml-4 mt-3 border-l-2 border-accent/20 pl-4">
          <p className="text-xs font-semibold text-ink">{r.user?.name}</p>
          <p className="mt-0.5 text-sm text-ink">{r.content}</p>
        </div>
      ))}

      {replyTo === comment.id && (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            rows={2}
            placeholder="답글을 입력하세요"
            className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <Button size="sm" onClick={onReply}>
            등록
          </Button>
        </div>
      )}
    </li>
  )
}

function PinCard({
  pin,
  projectId,
  isAuthor,
}: {
  pin: PinComment & { itemTitle?: string }
  projectId: string
  isAuthor: boolean
}) {
  return (
    <li className="rounded-2xl border border-border bg-surface-raised p-4 shadow-[var(--shadow-card)]">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white">
            {pin.comment?.user?.name?.charAt(0) ?? pin.pin_number}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="text-sm font-semibold text-ink">
                {pin.comment?.user?.name ?? '참여자'}
              </p>
              {isAuthor && (
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-ink-muted">
                  작성자
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-semibold text-accent">
                <IconPin className="h-3 w-3" /> 핀 댓글
              </span>
            </div>
            <p className="text-xs text-ink-muted">
              {formatDistanceToNow(new Date(pin.created_at), { addSuffix: true, locale: ko })}
            </p>
          </div>
        </div>
      </div>
      <p className="text-sm leading-relaxed text-ink">{pin.comment?.content}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
          #{pin.itemTitle ?? '시안'}
        </span>
        <span className="text-xs text-ink-muted">핀 #{pin.pin_number}</span>
        <Link
          to={`/projects/${projectId}/items/${pin.item_id}`}
          className="text-xs font-medium text-accent hover:underline"
        >
          시안으로 이동
        </Link>
      </div>
    </li>
  )
}

function ToolbarIcon({ kind }: { kind: 'image' | 'mention' | 'emoji' }) {
  return (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg hover:bg-surface">
      {kind === 'image' && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <circle cx="8.5" cy="10" r="1.5" />
          <path d="m21 15-4.5-4.5L9 18" />
        </svg>
      )}
      {kind === 'mention' && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="12" cy="12" r="8" />
          <path d="M16 12a4 4 0 1 1-1.5-3.1V16" />
        </svg>
      )}
      {kind === 'emoji' && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="12" cy="12" r="9" />
          <path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" />
        </svg>
      )}
    </span>
  )
}

function IconChat() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
    </svg>
  )
}
function IconPin({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 17v5M9 3h6l-1 7h3l-5 7-5-7h3L9 3z" />
    </svg>
  )
}
function IconUsers() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}
function IconBell() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}
function IconHeart({ filled }: { filled?: boolean }) {
  return filled ? (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 21s-7-4.4-9.5-8.2C.6 9.6 2.2 6 5.8 6c2 0 3.2 1.2 4.2 2.4C11 7.2 12.2 6 14.2 6c3.6 0 5.2 3.6 3.3 6.8C19 16.6 12 21 12 21z" />
    </svg>
  ) : (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 21s-7-4.4-9.5-8.2C.6 9.6 2.2 6 5.8 6c2 0 3.2 1.2 4.2 2.4C11 7.2 12.2 6 14.2 6c3.6 0 5.2 3.6 3.3 6.8C19 16.6 12 21 12 21z" />
    </svg>
  )
}
