import type { ProjectStatus } from '@/types'
import { STATUS_LABELS } from '@/types'
import type { ReactNode } from 'react'

const statusColors: Record<ProjectStatus, string> = {
  draft: 'bg-surface text-ink-muted border-border',
  active: 'bg-accent-soft text-accent border-accent/20',
  voting: 'bg-accent-soft text-accent border-accent/20',
  approval: 'bg-warning-soft text-warning border-warning/25',
  closed: 'bg-success-soft text-success border-success/20',
}

interface BadgeProps {
  status: ProjectStatus
  className?: string
}

export function StatusBadge({ status, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusColors[status]} ${className}`}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}

interface BadgeGenericProps {
  children: ReactNode
  tone?: 'default' | 'accent' | 'danger' | 'warning' | 'info' | 'success'
  className?: string
}

const tones = {
  default: 'bg-surface text-ink-muted border-border',
  accent: 'bg-accent-soft text-accent border-accent/20',
  danger: 'bg-danger-soft text-danger border-danger/20',
  warning: 'bg-warning-soft text-warning border-warning/25',
  info: 'bg-info-soft text-info border-info/20',
  success: 'bg-success-soft text-success border-success/20',
}

export function Badge({ children, tone = 'default', className = '' }: BadgeGenericProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  )
}
