import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Button } from '@/components/common/Button'
import { Input, Textarea } from '@/components/common/Input'
import { ToastContainer } from '@/components/common/Toast'
import { localApi } from '@/lib/localDb'
import { toast } from '@/stores/toastStore'
import type { Project, DesignItem } from '@/types'

export function PublicVote() {
  const { token } = useParams<{ token: string }>()
  const [project, setProject] = useState<Project | null>(null)
  const [items, setItems] = useState<DesignItem[]>([])
  const [name, setName] = useState('')
  const [started, setStarted] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    const p = localApi.getProjectByPublicToken(token)
    if (!p) {
      setError('접근 권한이 없습니다')
      return
    }
    if (p.visibility !== 'link') {
      setError('접근 권한이 없습니다')
      return
    }
    if (p.status === 'closed') {
      setError(`투표가 마감되었습니다 (마감일: ${new Date(p.deadline).toLocaleDateString('ko-KR')})`)
      return
    }
    setProject(p)
    setItems(localApi.getItems(p.id))
  }, [token])

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface px-4">
        <p className="text-lg text-ink-muted">{error}</p>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    )
  }

  if (done) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-4">
        <h1 className="font-display text-3xl">투표해주셔서 감사합니다!</h1>
        <p className="mt-3 text-ink-muted">여러분의 의견이 반영됩니다.</p>
        <ToastContainer />
      </div>
    )
  }

  if (!started) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-surface-raised p-8">
          <p className="mb-1 text-center font-display text-2xl">ApprovalOS</p>
          <h1 className="mb-6 text-center text-lg font-semibold">{project.title}</h1>
          <Input
            label="이름을 입력해주세요"
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 20))}
            placeholder="이름 또는 닉네임"
          />
          <Button
            className="mt-4 w-full"
            disabled={!name.trim()}
            onClick={() => setStarted(true)}
          >
            투표 시작하기
          </Button>
        </div>
        <ToastContainer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-center text-xl font-semibold">{project.title}</h1>
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <label
              key={item.id}
              className={`cursor-pointer overflow-hidden rounded-xl border ${
                selected.includes(item.id) ? 'border-accent ring-2 ring-accent/20' : 'border-border'
              }`}
            >
              <div className="aspect-video bg-surface-raised">
                {item.current_version?.file_url && (
                  <img src={item.current_version.file_url} alt="" className="h-full w-full object-contain" />
                )}
              </div>
              <div className="flex items-center gap-2 bg-surface-raised p-3">
                <input
                  type={project.vote_type === 'single' ? 'radio' : 'checkbox'}
                  checked={selected.includes(item.id)}
                  onChange={() => {
                    if (project.vote_type === 'single') setSelected([item.id])
                    else
                      setSelected((prev) =>
                        prev.includes(item.id) ? prev.filter((x) => x !== item.id) : [...prev, item.id]
                      )
                  }}
                />
                <span className="text-sm font-medium">{item.title}</span>
              </div>
            </label>
          ))}
        </div>
        <Textarea className="mt-4" placeholder="의견 (선택)" rows={2} />
        <Button
          className="mt-4 w-full"
          disabled={selected.length === 0}
          onClick={() => {
            localApi.upsertVote({
              project_id: project.id,
              user_id: null,
              guest_name: name.trim(),
              selected_item_ids: selected,
              rankings: selected,
              scores: {},
              comment: null,
            })
            toast.success('투표가 완료되었습니다')
            setDone(true)
          }}
        >
          제출
        </Button>
      </div>
      <ToastContainer />
    </div>
  )
}
