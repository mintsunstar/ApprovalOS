import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import { Button } from '@/components/common/Button'
import { StoredImage } from '@/components/common/StoredImage'
import { localApi } from '@/lib/localDb'
import { toast } from '@/stores/toastStore'
import type { DesignItem, ItemVersion, PinComment } from '@/types'

export function CompareMode() {
  const { id } = useParams<{ id: string }>()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [items, setItems] = useState<DesignItem[]>([])
  const [leftId, setLeftId] = useState(params.get('a') ?? '')
  const [rightId, setRightId] = useState(params.get('b') ?? '')
  const [leftVerId, setLeftVerId] = useState(params.get('va') ?? '')
  const [rightVerId, setRightVerId] = useState(params.get('vb') ?? '')
  const [split, setSplit] = useState(50)
  const [showPins, setShowPins] = useState(true)
  const [leftPins, setLeftPins] = useState<PinComment[]>([])
  const [rightPins, setRightPins] = useState<PinComment[]>([])
  const dragging = useState(false)

  useEffect(() => {
    if (!id) return
    const list = localApi.getItems(id)
    setItems(list)
    if (!leftId && list[0]) setLeftId(list[0].id)
    if (!rightId && list[1]) setRightId(list[1].id)
    else if (!rightId && list[0]) setRightId(list[0].id)
  }, [id])

  const leftItem = items.find((i) => i.id === leftId)
  const rightItem = items.find((i) => i.id === rightId)

  const leftVer: ItemVersion | undefined = useMemo(() => {
    if (!leftItem) return undefined
    return leftItem.versions?.find((v) => v.id === leftVerId) ?? leftItem.current_version
  }, [leftItem, leftVerId])

  const rightVer: ItemVersion | undefined = useMemo(() => {
    if (!rightItem) return undefined
    return rightItem.versions?.find((v) => v.id === rightVerId) ?? rightItem.current_version
  }, [rightItem, rightVerId])

  useEffect(() => {
    if (leftId) setLeftPins(localApi.getPins(leftId))
    if (rightId) setRightPins(localApi.getPins(rightId))
  }, [leftId, rightId])

  useEffect(() => {
    if (leftId && rightId && leftId === rightId && leftVer?.id && rightVer?.id && leftVer.id === rightVer.id) {
      toast.warning('서로 다른 시안 또는 버전을 선택해주세요')
    }
  }, [leftId, rightId, leftVer, rightVer])

  if (items.length < 1) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>비교할 시안이 없습니다. 시안을 추가해주세요</p>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-[#1a1d21] text-white">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-3">
          <Button size="sm" variant="secondary" onClick={() => navigate(-1)}>
            ← 나가기
          </Button>
          <h1 className="font-semibold">비교 모드</h1>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant={showPins ? 'primary' : 'secondary'} onClick={() => setShowPins(!showPins)}>
            핀 표시
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 border-b border-white/10 px-4 py-2 text-sm">
        <div className="flex gap-2">
          <select
            className="rounded border border-white/20 bg-transparent px-2 py-1"
            value={leftId}
            onChange={(e) => {
              setLeftId(e.target.value)
              setLeftVerId('')
            }}
          >
            {items.map((i) => (
              <option key={i.id} value={i.id} className="text-ink">
                {i.title}
              </option>
            ))}
          </select>
          <select
            className="rounded border border-white/20 bg-transparent px-2 py-1"
            value={leftVer?.id ?? ''}
            onChange={(e) => setLeftVerId(e.target.value)}
          >
            {(leftItem?.versions ?? []).map((v) => (
              <option key={v.id} value={v.id} className="text-ink">
                v{v.version_number}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <select
            className="rounded border border-white/20 bg-transparent px-2 py-1"
            value={rightId}
            onChange={(e) => {
              setRightId(e.target.value)
              setRightVerId('')
            }}
          >
            {items.map((i) => (
              <option key={i.id} value={i.id} className="text-ink">
                {i.title}
              </option>
            ))}
          </select>
          <select
            className="rounded border border-white/20 bg-transparent px-2 py-1"
            value={rightVer?.id ?? ''}
            onChange={(e) => setRightVerId(e.target.value)}
          >
            {(rightItem?.versions ?? []).map((v) => (
              <option key={v.id} value={v.id} className="text-ink">
                v{v.version_number}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div
        className="relative flex-1 overflow-hidden"
        onMouseMove={(e) => {
          if (!dragging[0]) return
          const rect = e.currentTarget.getBoundingClientRect()
          const pct = ((e.clientX - rect.left) / rect.width) * 100
          setSplit(Math.max(10, Math.min(90, pct)))
        }}
        onMouseUp={() => dragging[1](false)}
        onMouseLeave={() => dragging[1](false)}
      >
        <div
          className="absolute inset-0"
          style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}
        >
          <PanelImage url={leftVer?.file_url} pins={showPins ? leftPins : []} />
        </div>
        <div
          className="absolute inset-0"
          style={{ clipPath: `inset(0 0 0 ${split}%)` }}
        >
          <PanelImage url={rightVer?.file_url} pins={showPins ? rightPins : []} />
        </div>
        <div
          className="absolute bottom-0 top-0 z-20 w-1 cursor-ew-resize bg-white"
          style={{ left: `${split}%`, transform: 'translateX(-50%)' }}
          onMouseDown={() => dragging[1](true)}
        >
          <div className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-accent" />
        </div>
      </div>

      <div className="flex justify-between border-t border-white/10 px-6 py-3 text-sm text-white/80">
        <span>
          {leftItem?.title}: {leftItem?.vote_count ?? 0}표 ({leftItem?.vote_rate ?? 0}%) ★{leftItem?.avg_score ?? 0}
        </span>
        <span>
          {rightItem?.title}: {rightItem?.vote_count ?? 0}표 ({rightItem?.vote_rate ?? 0}%) ★{rightItem?.avg_score ?? 0}
        </span>
      </div>
    </div>
  )
}

function PanelImage({ url, pins }: { url?: string; pins: PinComment[] }) {
  return (
    <div className="flex h-full w-full items-center justify-center p-8">
      <TransformWrapper>
        <TransformComponent>
          <div className="relative inline-block">
            {url ? (
              <StoredImage fileRef={url} alt="" className="max-h-[70vh] max-w-full object-contain" />
            ) : (
              <p className="text-white/50">이미지 없음</p>
            )}
            {pins.map((pin) => (
              <span
                key={pin.id}
                className={`absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[10px] font-bold text-white ${
                  pin.is_resolved ? 'bg-gray-500' : 'bg-sky-500'
                }`}
                style={{ left: `${pin.pin_x * 100}%`, top: `${pin.pin_y * 100}%` }}
              >
                {pin.pin_number}
              </span>
            ))}
          </div>
        </TransformComponent>
      </TransformWrapper>
    </div>
  )
}
