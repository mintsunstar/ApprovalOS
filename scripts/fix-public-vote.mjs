import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const j = (s) => JSON.stringify(s)
const labels = JSON.parse(fs.readFileSync(path.join(root, 'scripts/ko-public-vote.json'), 'utf8'))

const src = `import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Button } from '@/components/common/Button'
import { Input, Textarea } from '@/components/common/Input'
import { ToastContainer } from '@/components/common/Toast'
import { StoredImage } from '@/components/common/StoredImage'
import { localApi } from '@/lib/localDb'
import { toast } from '@/stores/toastStore'
import type { Project, DesignItem } from '@/types'

export function PublicVote() {
  const { token } = useParams<{ token: string }>()
  const [project, setProject] = useState<Project | null>(null)
  const [items, setItems] = useState<DesignItem[]>([])
  const [name, setName] = useState('')
  const [comment, setComment] = useState('')
  const [started, setStarted] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    const p = localApi.getProjectByPublicToken(token)
    if (!p) {
      setError(${j(labels.noAccess)})
      return
    }
    if (p.visibility !== 'link') {
      setError(${j(labels.noAccess)})
      return
    }
    if (p.status === 'closed') {
      setError(
        ${j(labels.closedPrefix)} +
          new Date(p.deadline).toLocaleDateString('ko-KR') +
          ')'
      )
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
        <h1 className="font-display text-3xl">{${j(labels.thanks)}}</h1>
        <p className="mt-3 text-ink-muted">{${j(labels.thanksDesc)}}</p>
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
            label={${j(labels.nameLabel)}}
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 20))}
            placeholder={${j(labels.namePh)}}
          />
          <Button
            className="mt-4 w-full"
            disabled={!name.trim()}
            onClick={() => setStarted(true)}
          >
            {${j(labels.start)}}
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
              className={\`cursor-pointer overflow-hidden rounded-xl border \${
                selected.includes(item.id) ? 'border-accent ring-2 ring-accent/20' : 'border-border'
              }\`}
            >
              <div className="aspect-video bg-surface-raised">
                {item.current_version?.file_url && (
                  <StoredImage
                    fileRef={item.current_version.file_url}
                    alt=""
                    className="h-full w-full object-contain"
                  />
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
        <Textarea
          className="mt-4"
          placeholder={${j(labels.commentPh)}}
          rows={2}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
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
              comment: comment.trim() || null,
            })
            toast.success(${j(labels.done)})
            setDone(true)
          }}
        >
          {${j(labels.submit)}}
        </Button>
      </div>
      <ToastContainer />
    </div>
  )
}
`

fs.writeFileSync(path.join(root, 'src/pages/PublicVote.tsx'), src, 'utf8')
console.log('PublicVote hangul', /[\uAC00-\uD7A3]/.test(src), 'StoredImage', src.includes('StoredImage'))
