import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import { Button } from '@/components/common/Button'
import { Badge } from '@/components/common/Badge'
import { Modal, ConfirmDialog } from '@/components/common/Modal'
import { Textarea, Input } from '@/components/common/Input'
import { useAuthStore } from '@/stores/authStore'
import { localApi, migrateBlobsToIndexedDb } from '@/lib/localDb'
import { fileToStoredRef } from '@/lib/fileStore'
import { toPercent } from '@/utils/pinCoords'
import { toast } from '@/stores/toastStore'
import { StoredImage, useStoredUrl } from '@/components/common/StoredImage'
import type { DesignItem, PinComment, ItemVersion } from '@/types'

export function ItemDetail() {
  const { id, itemId } = useParams<{ id: string; itemId: string }>()
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const [item, setItem] = useState<DesignItem | null>(null)
  const [pins, setPins] = useState<PinComment[]>([])
  const [showPins, setShowPins] = useState(true)
  const [hideResolved, setHideResolved] = useState(false)
  const [viewVersion, setViewVersion] = useState<ItemVersion | null>(null)
  const [draftPin, setDraftPin] = useState<{ x: number; y: number } | null>(null)
  const [pinText, setPinText] = useState('')
  const [activePin, setActivePin] = useState<string | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [changeNote, setChangeNote] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [restoreId, setRestoreId] = useState<string | null>(null)
  const [compareVersions, setCompareVersions] = useState<string[]>([])
  const imgRef = useRef<HTMLDivElement>(null)

  const displayUrl = useStoredUrl(viewVersion?.file_url ?? item?.current_version?.file_url)

  const refresh = () => {
    if (!itemId) return
    const found = localApi.getItem(itemId)
    setItem(found)
    if (found) {
      setViewVersion(found.current_version ?? null)
      setPins(localApi.getPins(itemId))
    }
  }

  useEffect(() => {
    refresh()
  }, [itemId])

  if (!item || !user || !id) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    )
  }

  const isAdmin = user.role === 'admin'
  const versions = item.versions ?? []
  const visiblePins = pins.filter((p) => !hideResolved || !p.is_resolved)
  const items = localApi.getItems(id)
  const idx = items.findIndex((i) => i.id === itemId)

  const handleImageClick = (e: React.MouseEvent) => {
    if (!imgRef.current || !viewVersion) return
    const rect = imgRef.current.getBoundingClientRect()
    const { pin_x, pin_y } = toPercent(e.clientX, e.clientY, rect)
    setDraftPin({ x: pin_x, y: pin_y })
    setPinText('')
    setActivePin(null)
  }

  const submitPin = () => {
    if (!draftPin || !pinText.trim() || !viewVersion) return
    localApi.createPin({
      item_id: item.id,
      version_id: viewVersion.id,
      project_id: id,
      user_id: user.id,
      content: pinText.trim(),
      pin_x: draftPin.x,
      pin_y: draftPin.y,
    })
    toast.success('핀 댓글이 등록되었습니다')
    setDraftPin(null)
    setPinText('')
    refresh()
  }

  const uploadVersion = async () => {
    if (!uploadFile) {
      toast.error('파일을 선택해주세요')
      return
    }
    try {
      await migrateBlobsToIndexedDb()
      const file_url = await fileToStoredRef(uploadFile)
      localApi.addVersion(item.id, file_url, changeNote.trim() || null, user.id)
      toast.success('새 버전이 업로드되었습니다')
      setUploadOpen(false)
      setPreview(null)
      setUploadFile(null)
      setChangeNote('')
      refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '업로드 실패')
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col">
      <div className="flex flex-col gap-3 border-b border-border bg-surface-raised px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Link to={`/projects/${id}`} className="shrink-0 text-sm text-ink-muted hover:text-ink">
            ← 목록
          </Link>
          <h1 className="truncate font-semibold">{item.title}</h1>
          <Badge tone="info">v{viewVersion?.version_number ?? 1}</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant={showPins ? 'primary' : 'secondary'} onClick={() => setShowPins(!showPins)}>
            핀 {showPins ? 'ON' : 'OFF'}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setHideResolved(!hideResolved)}>
            해결됨 {hideResolved ? '숨김' : '표시'}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 flex-col lg:flex-row">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="relative flex-1 bg-[#1a1d21]" ref={imgRef}>
            <TransformWrapper>
              <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full flex items-center justify-center">
                <div className="relative inline-block max-h-[55vh] cursor-crosshair sm:max-h-[70vh]" onClick={handleImageClick}>
                  {displayUrl && (
                    <img src={displayUrl} alt={item.title} className="max-h-[55vh] max-w-full object-contain sm:max-h-[70vh]" />
                  )}
                  {showPins &&
                    visiblePins.map((pin) => (
                      <button
                        key={pin.id}
                        type="button"
                        className={`absolute z-10 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-xs font-bold text-white shadow ${
                          pin.is_resolved ? 'bg-ink-muted' : 'bg-info'
                        }`}
                        style={{ left: `${pin.pin_x * 100}%`, top: `${pin.pin_y * 100}%` }}
                        onClick={(e) => {
                          e.stopPropagation()
                          setActivePin(activePin === pin.id ? null : pin.id)
                          setDraftPin(null)
                        }}
                      >
                        {pin.pin_number}
                      </button>
                    ))}
                  {draftPin && (
                    <span
                      className="absolute z-10 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-ink-muted text-xs text-white"
                      style={{ left: `${draftPin.x * 100}%`, top: `${draftPin.y * 100}%` }}
                    >
                      +
                    </span>
                  )}
                </div>
              </TransformComponent>
            </TransformWrapper>

            {draftPin && (
              <div className="absolute inset-x-3 top-3 z-20 rounded-xl border border-border bg-surface-raised p-4 shadow-xl sm:inset-x-auto sm:right-4 sm:w-72">
                <p className="mb-2 text-sm font-medium">핀 댓글 작성</p>
                <Textarea value={pinText} onChange={(e) => setPinText(e.target.value)} rows={3} />
                <div className="mt-2 flex justify-end gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setDraftPin(null)}>
                    취소
                  </Button>
                  <Button size="sm" onClick={submitPin}>
                    등록
                  </Button>
                </div>
              </div>
            )}

            {activePin && (
              <div className="absolute inset-x-3 top-3 z-20 rounded-xl border border-border bg-surface-raised p-4 shadow-xl sm:inset-x-auto sm:right-4 sm:w-72">
                {(() => {
                  const pin = pins.find((p) => p.id === activePin)
                  if (!pin) return null
                  return (
                    <>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-info text-xs text-white">
                          {pin.pin_number}
                        </span>
                        <button onClick={() => setActivePin(null)}>×</button>
                      </div>
                      <p className="text-sm font-medium">{pin.comment?.user?.name}</p>
                      <p className="mt-1 text-sm">{pin.comment?.content}</p>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="mt-3"
                        onClick={() => {
                          localApi.resolvePin(pin.id, !pin.is_resolved)
                          refresh()
                          setActivePin(null)
                        }}
                      >
                        {pin.is_resolved ? '미해결로 변경' : '해결됨으로 표시'}
                      </Button>
                    </>
                  )
                })()}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-border bg-surface-raised px-4 py-3">
            <Button
              size="sm"
              variant="secondary"
              disabled={idx <= 0}
              onClick={() => navigate(`/projects/${id}/items/${items[idx - 1].id}`)}
            >
              ← 이전 시안
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={idx >= items.length - 1}
              onClick={() => navigate(`/projects/${id}/items/${items[idx + 1].id}`)}
            >
              다음 시안 →
            </Button>
          </div>

          <div className="border-t border-border p-4">
            <h3 className="mb-3 text-sm font-semibold">핀 댓글</h3>
            {visiblePins.length === 0 ? (
              <p className="text-sm text-ink-muted">이미지 위를 클릭해 핀을 남겨보세요</p>
            ) : (
              <ul className="space-y-2">
                {visiblePins.map((pin) => (
                  <li key={pin.id} className="flex gap-2 text-sm">
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs text-white ${
                        pin.is_resolved ? 'bg-ink-muted' : 'bg-info'
                      }`}
                    >
                      {pin.pin_number}
                    </span>
                    <div>
                      <span className="font-medium">{pin.comment?.user?.name}: </span>
                      {pin.comment?.content}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <aside className="w-full shrink-0 overflow-auto border-t border-border bg-surface-raised p-4 lg:w-72 lg:border-l lg:border-t-0">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold">버전 히스토리</h3>
            {isAdmin && (
              <Button size="sm" variant="secondary" onClick={() => setUploadOpen(true)}>
                새 버전
              </Button>
            )}
          </div>
          <ul className="space-y-2">
            {versions.map((v) => (
              <li key={v.id}>
                <button
                  className={`w-full rounded-lg border p-2 text-left ${
                    viewVersion?.id === v.id ? 'border-accent bg-accent-soft' : 'border-border hover:bg-surface'
                  }`}
                  onClick={() => {
                    if (compareVersions.length > 0) {
                      setCompareVersions((prev) => {
                        if (prev.includes(v.id)) return prev.filter((x) => x !== v.id)
                        if (prev.length >= 2) {
                          toast.warning('2개만 선택할 수 있습니다')
                          return prev
                        }
                        return [...prev, v.id]
                      })
                    } else {
                      setViewVersion(v)
                    }
                  }}
                >
                  <div className="flex items-center gap-2">
                    {v.thumbnail_url && (
                      <StoredImage
                        fileRef={v.thumbnail_url}
                        alt=""
                        className="h-10 w-10 rounded object-cover"
                      />
                    )}
                    <div>
                      <p className="text-sm font-medium">
                        v{v.version_number}
                        {v.id === item.current_version_id && (
                          <Badge tone="accent" className="ml-1">
                            현재
                          </Badge>
                        )}
                      </p>
                      <p className="text-xs text-ink-muted">{v.change_note || '메모 없음'}</p>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
          {viewVersion && viewVersion.id !== item.current_version_id && isAdmin && (
            <Button className="mt-3 w-full" size="sm" variant="secondary" onClick={() => setRestoreId(viewVersion.id)}>
              이 버전으로 복원
            </Button>
          )}
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              className="flex-1"
              onClick={() => {
                if (compareVersions.length === 2) {
                  navigate(
                    `/projects/${id}/compare?a=${item.id}&b=${item.id}&va=${compareVersions[0]}&vb=${compareVersions[1]}`
                  )
                } else {
                  setCompareVersions([])
                  toast.info('비교할 버전 2개를 선택하세요')
                  setCompareVersions([])
                }
              }}
            >
              {compareVersions.length > 0 ? `버전 비교 (${compareVersions.length}/2)` : '버전 비교'}
            </Button>
            {compareVersions.length > 0 && compareVersions.length < 2 && (
              <Button
                size="sm"
                onClick={() => {
                  if (compareVersions.length === 2) {
                    navigate(
                      `/projects/${id}/compare?a=${item.id}&b=${item.id}&va=${compareVersions[0]}&vb=${compareVersions[1]}`
                    )
                  } else {
                    toast.warning('버전 2개를 선택해주세요')
                  }
                }}
              >
                실행
              </Button>
            )}
          </div>
          {compareVersions.length === 2 && (
            <Button
              className="mt-2 w-full"
              size="sm"
              onClick={() =>
                navigate(
                  `/projects/${id}/compare?a=${item.id}&b=${item.id}&va=${compareVersions[0]}&vb=${compareVersions[1]}`
                )
              }
            >
              선택한 버전 비교
            </Button>
          )}

          <div className="mt-6 border-t border-border pt-4">
            <h3 className="mb-2 text-sm font-semibold">시안 정보</h3>
            <div className="mb-2 flex flex-wrap gap-1">
              {item.keywords.map((k) => (
                <span key={k} className="rounded bg-surface px-2 py-0.5 text-xs">
                  {k}
                </span>
              ))}
            </div>
            <p className="text-sm text-ink-muted">득표: {item.vote_count ?? 0}표</p>
            <p className="text-sm text-ink-muted">평점: ★ {item.avg_score ?? 0}</p>
          </div>
        </aside>
      </div>

      <Modal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        title="새 버전 업로드"
        footer={
          <>
            <Button variant="secondary" onClick={() => setUploadOpen(false)}>
              취소
            </Button>
            <Button onClick={uploadVersion}>업로드</Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Input
            type="file"
            accept=".png,.jpg,.jpeg,.svg,.pdf"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (!f) return
              setUploadFile(f)
              setPreview(URL.createObjectURL(f))
            }}
          />
          {preview && <img src={preview} alt="" className="max-h-40 object-contain" />}
          <Textarea
            label="변경 내용 (선택)"
            value={changeNote}
            onChange={(e) => setChangeNote(e.target.value)}
            rows={2}
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={!!restoreId}
        onClose={() => setRestoreId(null)}
        title="버전 복원"
        description="이 버전을 현재 버전으로 지정하시겠습니까?"
        confirmLabel="복원"
        onConfirm={() => {
          if (restoreId) {
            localApi.restoreVersion(item.id, restoreId)
            toast.success('버전이 복원되었습니다')
            setRestoreId(null)
            refresh()
          }
        }}
      />
    </div>
  )
}
