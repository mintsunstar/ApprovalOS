import { useState } from 'react'

interface DateRangeCalendarProps {
  /** 'YYYY-MM-DD' or null */
  start: string | null
  /** 'YYYY-MM-DD' or null */
  end: string | null
  onChange: (start: string | null, end: string | null) => void
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function toKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function fmtDot(key: string | null): string {
  if (!key) return '-'
  return key.replaceAll('-', '. ') + '.'
}

/** Inline month calendar: first click sets start, second click sets end */
export function DateRangeCalendar({ start, end, onChange }: DateRangeCalendarProps) {
  const initial = start ? new Date(start) : new Date()
  const [viewYear, setViewYear] = useState(initial.getFullYear())
  const [viewMonth, setViewMonth] = useState(initial.getMonth())

  const firstDay = new Date(viewYear, viewMonth, 1)
  const startOffset = firstDay.getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const todayKey = toKey(new Date())

  const cells: (string | null)[] = [
    ...Array.from({ length: startOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) =>
      toKey(new Date(viewYear, viewMonth, i + 1))
    ),
  ]

  const moveMonth = (delta: number) => {
    const d = new Date(viewYear, viewMonth + delta, 1)
    setViewYear(d.getFullYear())
    setViewMonth(d.getMonth())
  }

  const pick = (key: string) => {
    if (!start || (start && end)) {
      onChange(key, null)
      return
    }
    if (key < start) {
      onChange(key, null)
      return
    }
    onChange(start, key)
  }

  const inRange = (key: string) => Boolean(start && end && key > start && key < end)

  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          aria-label="이전 달"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-muted hover:bg-accent-soft hover:text-accent"
          onClick={() => moveMonth(-1)}
        >
          ‹
        </button>
        <p className="text-sm font-semibold text-ink">
          {viewYear}년 {viewMonth + 1}월
        </p>
        <button
          type="button"
          aria-label="다음 달"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-muted hover:bg-accent-soft hover:text-accent"
          onClick={() => moveMonth(1)}
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 text-center">
        {WEEKDAYS.map((w, i) => (
          <span
            key={w}
            className={`py-1 text-[11px] font-medium ${
              i === 0 ? 'text-danger' : i === 6 ? 'text-accent' : 'text-ink-muted'
            }`}
          >
            {w}
          </span>
        ))}
        {cells.map((key, idx) => {
          if (!key) return <span key={`empty-${idx}`} />
          const isStart = key === start
          const isEnd = key === end
          const isEdge = isStart || isEnd
          const isToday = key === todayKey
          return (
            <button
              key={key}
              type="button"
              onClick={() => pick(key)}
              className={`relative mx-auto my-0.5 flex h-8 w-8 items-center justify-center rounded-full text-sm transition ${
                isEdge
                  ? 'bg-accent font-semibold text-white'
                  : inRange(key)
                    ? 'bg-accent-soft text-accent'
                    : 'text-ink hover:bg-accent-soft/60'
              } ${isToday && !isEdge ? 'ring-1 ring-accent/50' : ''}`}
            >
              {Number(key.slice(8))}
            </button>
          )
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-ink-muted">
            시작일 <span className="font-semibold text-ink">{fmtDot(start)}</span>
          </span>
          <span className="text-ink-muted">→</span>
          <span className="text-ink-muted">
            종료일 <span className="font-semibold text-ink">{fmtDot(end)}</span>
          </span>
        </div>
        {(start || end) && (
          <button
            type="button"
            className="font-medium text-ink-muted hover:text-danger"
            onClick={() => onChange(null, null)}
          >
            초기화
          </button>
        )}
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">
        날짜를 클릭해 시작일을, 한 번 더 클릭해 종료일(마감일)을 지정하세요.
      </p>
    </div>
  )
}
