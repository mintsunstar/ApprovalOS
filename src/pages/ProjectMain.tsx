import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import { Button } from '@/components/common/Button'
import { Badge } from '@/components/common/Badge'
import { EmptyState } from '@/components/common/EmptyState'
import { Modal } from '@/components/common/Modal'
import { Input, Textarea } from '@/components/common/Input'
import { ProjectLNB, ProjectHeader } from '@/components/layout/ProjectLayout'
import { useAuthStore } from '@/stores/authStore'
import { useProjectStore } from '@/stores/projectStore'
import { localApi } from '@/lib/localDb'
import { toast } from '@/stores/toastStore'
import type { DesignItem } from '@/types'

export function ProjectMain() {
  const { id } = useParams<{ id: string }>()
  const user = useAuthStore((s) => s.user)
  const { currentProject, items, loadProject, refreshItems } = useProjectStore()
  const [uploadOpen, setUploadOpen] = useState(false)
  const [compareMode, setCompareMode] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    if (id) loadProject(id)
  }, [id, loadProject])

  if (!currentProject || currentProject.id !== id) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    )
  }

  const project = currentProject
  const isAdmin = user?.role === 'admin' || user?.id === project.created_by
  const dday = differenceInCalendarDays(parseISO(project.deadline), new Date())
  const analysis = localApi.getAnalysis(project.id)

  const toggleSelect = (itemId: string) => {
    setSelected((prev) => {
      if (prev.includes(itemId)) return prev.filter((x) => x !== itemId)
      if (prev.length >= 2) {
        toast.warning('2개만 선택할 수 있습니다')
        return prev
      }
      return [...prev, itemId]
    })
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col">
      <ProjectHeader
        project={project}
        actions={
          <>
            {compareMode ? (
              <>
                <Button
                  size="sm"
                  disabled={selected.length !== 2}
                  onClick={() =>
                    navigate(`/projects/${project.id}/compare?a=${selected[0]}&b=${selected[1]}`)
                  }
                >
                  비교하기 ({selected.length}/2)
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setCompareMode(false)
                    setSelected([])
                  }}
                >
                  취소
                </Button>
              </>
            ) : (
              <Button size="sm" variant="secondary" onClick={() => setCompareMode(true)}>
                비교 모드
              </Button>
            )}
            {isAdmin && (
              <Button size="sm" onClick={() => setUploadOpen(true)}>
                시안 업로드
              </Button>
            )}
          </>
        }
      />
      <ProjectLNB project={project} isAdmin={isAdmin} />
      <div className="flex flex-1">
        <div className="min-w-0 flex-1 p-6">
          {/* Vote progress bar — mockup style */}
          <div className="card mb-6 flex flex-wrap items-center gap-6 p-4">
            <div className="min-w-[140px]">
              <p className="text-xs text-ink-muted">투표 진행률</p>
              <p className="text-lg font-bold text-accent">{project.vote_rate}%</p>
            </div>
            <div className="h-2 min-w-[160px] flex-1 overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${project.vote_rate ?? 0}%` }}
              />
            </div>
            <div className="flex gap-4 text-sm text-ink-muted">
              <span>참여자 {project.member_count}명</span>
              <span className={dday <= 3 ? 'font-semibold text-danger' : ''}>
                D-{Math.max(0, dday)}
              </span>
            </div>
          </div>

          {items.length === 0 ? (
            <EmptyState
              title="첫 시안을 업로드해보세요"
              description="PNG, JPG, SVG, PDF 파일을 지원합니다"
              actionLabel={isAdmin ? '시안 업로드' : undefined}
              onAction={isAdmin ? () => setUploadOpen(true) : undefined}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  projectId={project.id}
                  compareMode={compareMode}
                  selected={selected.includes(item.id)}
                  onToggle={() => toggleSelect(item.id)}
                  isAdmin={!!isAdmin}
                  onRefresh={() => refreshItems(project.id)}
                />
              ))}
            </div>
          )}
        </div>
        <aside className="hidden w-72 shrink-0 border-l border-border bg-surface-raised p-5 xl:block">
          <h3 className="mb-4 text-sm font-bold">프로젝트 현황</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-muted">참여자</dt>
              <dd className="font-medium">{project.member_count}명</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-muted">투표율</dt>
              <dd className="font-medium text-accent">{project.vote_rate}%</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-muted">마감</dt>
              <dd className={dday <= 3 ? 'font-semibold text-danger' : 'font-medium'}>
                D-{Math.max(0, dday)}
              </dd>
            </div>
            {project.use_approval && (
              <div className="flex justify-between">
                <dt className="text-ink-muted">승인</dt>
                <dd className="font-medium">
                  {project.current_approval_step}/{project.total_approval_steps}단계
                </dd>
              </div>
            )}
          </dl>
          {analysis && (
            <div className="mt-6 rounded-xl bg-accent-soft/60 p-3">
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-accent">
                AI 의견 요약
              </h4>
              <p className="line-clamp-6 text-sm leading-relaxed text-ink-muted">
                {analysis.overall_summary}
              </p>
            </div>
          )}
          <Button
            className="mt-6 w-full"
            variant="secondary"
            size="sm"
            onClick={() => navigate(`/projects/${project.id}/report`)}
          >
            최종 보고서 생성
          </Button>
        </aside>
      </div>

      <UploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        projectId={project.id}
        userId={user!.id}
        onDone={() => {
          refreshItems(project.id)
          loadProject(project.id)
          setUploadOpen(false)
        }}
      />
    </div>
  )
}

function ItemCard({
  item,
  projectId,
  compareMode,
  selected,
  onToggle,
  isAdmin,
  onRefresh,
}: {
  item: DesignItem
  projectId: string
  compareMode: boolean
  selected: boolean
  onToggle: () => void
  isAdmin: boolean
  onRefresh: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()
  const versionNum = item.current_version?.version_number ?? 1

  return (
    <div
      className={`card card-hover group relative overflow-hidden transition ${
        selected ? 'border-accent ring-2 ring-accent/25' : ''
      }`}
    >
      {compareMode && (
        <button
          className="absolute left-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded border border-border bg-white"
          onClick={onToggle}
        >
          {selected && <span className="text-accent">✓</span>}
        </button>
      )}
      <Link to={`/projects/${projectId}/items/${item.id}`}>
        <div className="aspect-[4/3] overflow-hidden bg-surface">
          {item.current_version?.file_url ? (
            <img
              src={item.current_version.file_url}
              alt={item.title}
              className="h-full w-full object-contain"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-ink-muted">No image</div>
          )}
        </div>
      </Link>
      <div className="p-3">
        <div className="mb-1 flex items-start justify-between gap-2">
          <div>
            <Badge tone="info">v{versionNum}</Badge>
            <h3 className="mt-1 font-medium">{item.title}</h3>
          </div>
          {isAdmin && (
            <div className="relative">
              <button
                className="rounded p-1 text-ink-muted hover:bg-surface"
                onClick={() => setMenuOpen(!menuOpen)}
              >
                ⋯
              </button>
              {menuOpen && (
                <div className="absolute right-0 z-20 w-40 rounded-lg border border-border bg-surface-raised py-1 shadow-lg">
                  <button
                    className="block w-full px-3 py-1.5 text-left text-sm hover:bg-surface"
                    onClick={() => {
                      setMenuOpen(false)
                      navigate(`/projects/${projectId}/compare?a=${item.id}`)
                    }}
                  >
                    다른 시안과 비교
                  </button>
                  <button
                    className="block w-full px-3 py-1.5 text-left text-sm text-danger hover:bg-surface"
                    onClick={() => {
                      if (confirm('시안을 삭제하시겠습니까?')) {
                        localApi.deleteItem(item.id)
                        toast.success('삭제되었습니다')
                        onRefresh()
                      }
                      setMenuOpen(false)
                    }}
                  >
                    삭제
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        {item.keywords.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
            {item.keywords.map((k) => (
              <span key={k} className="rounded bg-surface px-1.5 py-0.5 text-[10px] text-ink-muted">
                {k}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-3 text-xs text-ink-muted">
          <span>{item.vote_count ?? 0}표 ({item.vote_rate ?? 0}%)</span>
          {(item.avg_score ?? 0) > 0 && <span>★ {item.avg_score}</span>}
          {(item.pin_count ?? 0) > 0 && <span>📍 {item.pin_count}</span>}
        </div>
      </div>
    </div>
  )
}

function UploadModal({
  open,
  onClose,
  projectId,
  userId,
  onDone,
}: {
  open: boolean
  onClose: () => void
  projectId: string
  userId: string
  onDone: () => void
}) {
  const [title, setTitle] = useState('')
  const [keywords, setKeywords] = useState('')
  const [description, setDescription] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const onFile = (file: File) => {
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'application/pdf']
    if (!allowed.includes(file.type) && !file.name.match(/\.(png|jpe?g|svg|pdf)$/i)) {
      toast.error('지원하지 않는 형식입니다 (PNG/JPG/SVG/PDF)')
      return
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error('파일 크기는 50MB 이하여야 합니다')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setPreview(reader.result as string)
    reader.readAsDataURL(file)
    if (!title) setTitle(file.name.replace(/\.[^.]+$/, ''))
  }

  const handleUpload = () => {
    if (!preview || !title.trim()) {
      toast.error('파일과 시안명을 입력해주세요')
      return
    }
    setLoading(true)
    try {
      localApi.createItem({
        project_id: projectId,
        title: title.trim(),
        keywords: keywords
          .split(/[,#\s]+/)
          .map((k) => k.trim())
          .filter(Boolean),
        description: description.trim() || null,
        file_url: preview,
        created_by: userId,
      })
      toast.success('시안이 업로드되었습니다')
      setTitle('')
      setKeywords('')
      setDescription('')
      setPreview(null)
      onDone()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '업로드 실패')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="시안 업로드"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button loading={loading} onClick={handleUpload}>
            업로드
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div
          className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-surface px-4 py-8"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            const f = e.dataTransfer.files[0]
            if (f) onFile(f)
          }}
        >
          {preview ? (
            <img src={preview} alt="preview" className="max-h-40 object-contain" />
          ) : (
            <p className="text-sm text-ink-muted">파일을 드래그하거나 클릭 (PNG/JPG/SVG/PDF)</p>
          )}
          <input
            ref={fileRef}
            type="file"
            accept=".png,.jpg,.jpeg,.svg,.pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onFile(f)
            }}
          />
        </div>
        <Input label="시안명 *" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Input
          label="키워드"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          placeholder="신뢰감, 전문성"
        />
        <Textarea label="설명" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
      </div>
    </Modal>
  )
}
