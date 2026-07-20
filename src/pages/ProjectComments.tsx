import { useEffect, useMemo, useState } from 'react'
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
      toast.error("댓글 내용을 입력해주세요")
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
    toast.success("댓글이 등록되었습니다")
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
                ['all', "전체"],
                ['pin', "핀 댓글"],
                ['item', "시안별"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                  tab === k ? 'bg-accent text-white' : 'text-ink-muted'
                }`}
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
              <option value="latest">{"최신순"}</option>
              <option value="likes">{"좋아요순"}</option>
            </select>
          )}
        </div>

        {tab === 'item' && (
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                filterItem === 'all' ? 'bg-accent text-white' : 'bg-surface text-ink-muted'
              }`}
              onClick={() => setFilterItem('all')}
            >
              {"전체"}
            </button>
            {items.map((item) => (
              <button
                key={item.id}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  filterItem === item.id ? 'bg-accent text-white' : 'bg-surface text-ink-muted'
                }`}
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
              placeholder={"의견을 남겨주세요"}
              rows={3}
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`rounded-full px-2.5 py-0.5 text-xs ${
                    taggedItems.includes(item.id)
                      ? 'bg-accent-soft text-accent'
                      : 'bg-surface text-ink-muted'
                  }`}
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
                {"등록"}
              </Button>
            </div>
          </div>
        )}

        {tab === 'pin' ? (
          pins.length === 0 ? (
            <EmptyState
              title={"핀 댓글이 없습니다"}
              description={"시안 상세에서 이미지에 핀을 남겨 의견을 공유하세요"}
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
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                          pin.is_resolved ? 'bg-ink-muted' : 'bg-accent'
                        }`}
                      >
                        {pin.pin_number}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm">{pin.comment?.content}</p>
                        <Link
                          to={`/projects/${project.id}/items/${pin.item_id}`}
                          className="mt-1 inline-block text-xs font-medium text-accent hover:underline"
                        >
                          {"시안으로 이동"}
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
            title={"댓글이 없습니다"}
            description={"첫 의견을 남겨보세요"}
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
                    className={`text-xs ${c.liked_by_me ? 'text-accent' : 'text-ink-muted'} ${
                      c.user_id === user.id ? 'opacity-40' : ''
                    }`}
                    disabled={c.user_id === user.id}
                    onClick={() => {
                      localApi.toggleLike(c.id, user.id)
                      refresh()
                    }}
                  >
                    {'\u2665'} {c.like_count}
                  </button>
                  <button className="text-xs text-ink-muted" onClick={() => setReplyTo(c.id)}>
                    {"답글"}
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
                      {"등록"}
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
