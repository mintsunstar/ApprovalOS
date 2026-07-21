export type ProjectStatus = 'draft' | 'active' | 'voting' | 'approval' | 'closed'
export type VoteType = 'single' | 'rank' | 'score' | 'combined'
export type UserRole = 'admin' | 'reviewer' | 'approver' | 'viewer'
export type ApprovalType = 'all' | 'majority'
export type ApprovalActionType = 'approved' | 'rejected'
export type CommentType = 'general' | 'pin'
export type NotificationType =
  | 'deadline_soon'
  | 'new_comment'
  | 'new_pin'
  | 'result_open'
  | 'analysis_done'
  | 'approval_requested'
  | 'approval_done'
  | 'rejected'
export type Visibility = 'internal' | 'link'
export type PlanType = 'free' | 'pro' | 'enterprise'
export type ApprovalLineStatus = 'pending' | 'active' | 'completed' | 'rejected'
export type AccountStatus = 'active' | 'suspended' | 'deleted'
export type WorkspaceStatus = 'active' | 'suspended' | 'deleted'
export type NoticeType = 'banner' | 'modal' | 'email'
export type NoticeStatus = 'draft' | 'published' | 'archived'
export type IncidentSeverity = 'info' | 'warning' | 'critical'
export type IncidentStatus = 'investigating' | 'identified' | 'monitoring' | 'resolved'
export type AdminActionType =
  | 'login'
  | 'logout'
  | 'workspace_suspend'
  | 'workspace_unsuspend'
  | 'workspace_plan_change'
  | 'user_suspend'
  | 'user_unsuspend'
  | 'user_force_delete'
  | 'user_reset_password'
  | 'plan_limits_update'
  | 'notice_create'
  | 'notice_publish'
  | 'notice_archive'
  | 'incident_create'
  | 'incident_update'
  | 'maintenance_toggle'

export interface Workspace {
  id: string
  name: string
  logo_url: string | null
  plan: PlanType
  status?: WorkspaceStatus
  invite_token: string
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  email: string
  name: string
  avatar_url: string | null
  company: string | null
  title: string | null
  workspace_id: string | null
  role: UserRole
  status?: AccountStatus
  notification_prefs: NotificationPrefs
  created_at: string
  updated_at: string
}

export interface PlanLimit {
  max_members: number
  max_projects: number
  storage_gb: number
}

export type PlanLimitsMap = Record<PlanType, PlanLimit>

export interface AdminUser {
  id: string
  email: string
  name: string
  /** 데모용 평문 (실서비스에서는 해시) */
  password: string
  failed_attempts: number
  locked_until: string | null
  created_at: string
}

export interface Notice {
  id: string
  title: string
  body: string
  type: NoticeType
  status: NoticeStatus
  starts_at: string | null
  ends_at: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface Incident {
  id: string
  title: string
  summary: string
  severity: IncidentSeverity
  status: IncidentStatus
  started_at: string
  resolved_at: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface AdminLog {
  id: string
  admin_user_id: string
  action: AdminActionType
  target_type: string | null
  target_id: string | null
  detail: string
  created_at: string
  admin?: AdminUser
}

export interface SystemFlags {
  maintenance: boolean
  maintenance_message: string
  maintenance_until: string | null
}

export const DEFAULT_PLAN_LIMITS: PlanLimitsMap = {
  free: { max_members: 5, max_projects: 5, storage_gb: 1 },
  pro: { max_members: 30, max_projects: 50, storage_gb: 50 },
  enterprise: { max_members: 9999, max_projects: 9999, storage_gb: 9999 },
}

export const DEFAULT_SYSTEM_FLAGS: SystemFlags = {
  maintenance: false,
  maintenance_message: '',
  maintenance_until: null,
}

export interface NotificationPrefs {
  deadline_soon: boolean
  new_comment: boolean
  new_pin: boolean
  result_open: boolean
  analysis_done: boolean
  approval_requested: boolean
  approval_done: boolean
  rejected: boolean
}

export interface Project {
  id: string
  workspace_id: string
  title: string
  description: string | null
  status: ProjectStatus
  vote_type: VoteType
  start_date?: string | null
  deadline: string
  visibility: Visibility
  public_token: string | null
  use_approval: boolean
  created_by: string
  created_at: string
  updated_at: string
  // computed / joined
  items?: DesignItem[]
  member_count?: number
  vote_rate?: number
  current_approval_step?: number
  total_approval_steps?: number
}

export interface DesignItem {
  id: string
  project_id: string
  title: string
  keywords: string[]
  description: string | null
  sort_order: number
  current_version_id: string | null
  created_by: string
  created_at: string
  updated_at: string
  // joined
  current_version?: ItemVersion
  versions?: ItemVersion[]
  vote_count?: number
  vote_rate?: number
  avg_score?: number
  pin_count?: number
}

export interface ItemVersion {
  id: string
  item_id: string
  version_number: number
  file_url: string
  thumbnail_url: string | null
  change_note: string | null
  created_by: string
  created_at: string
}

export interface Vote {
  id: string
  project_id: string
  user_id: string | null
  guest_name: string | null
  selected_item_ids: string[]
  rankings: string[]
  scores: Record<string, Record<string, number>>
  comment: string | null
  created_at: string
  updated_at: string
}

export interface Comment {
  id: string
  project_id: string
  user_id: string
  content: string
  type: CommentType
  item_ids: string[]
  parent_id: string | null
  like_count: number
  image_urls?: string[]
  created_at: string
  updated_at: string
  // joined
  user?: User
  liked_by_me?: boolean
  replies?: Comment[]
}

export interface PinComment {
  id: string
  item_id: string
  version_id: string
  comment_id: string
  pin_x: number
  pin_y: number
  pin_number: number
  is_resolved: boolean
  page_number: number | null
  created_at: string
  // joined
  comment?: Comment
}

export interface CommentLike {
  id: string
  comment_id: string
  user_id: string
  created_at: string
}

export interface AIAnalysis {
  id: string
  project_id: string
  keywords: KeywordResult[]
  item_summaries: Record<string, string>
  overall_summary: string
  sentiment: SentimentResult
  brand_fit_scores: Record<string, number>
  created_at: string
}

export interface KeywordResult {
  word: string
  count: number
  sentiment: 'positive' | 'neutral' | 'negative'
}

export interface SentimentResult {
  positive: number
  neutral: number
  negative: number
}

export interface ApprovalLine {
  id: string
  project_id: string
  step_order: number
  step_name: string
  approver_ids: string[]
  approval_type: ApprovalType
  status: ApprovalLineStatus
  deadline: string | null
  created_at: string
  // joined
  approvers?: User[]
  actions?: ApprovalAction[]
}

export interface ApprovalAction {
  id: string
  approval_line_id: string
  user_id: string
  action: ApprovalActionType
  selected_item_id: string | null
  reject_reason: string | null
  created_at: string
  // joined
  user?: User
}

export interface Invitation {
  id: string
  project_id: string | null
  workspace_id: string
  email: string
  role: UserRole
  token: string
  invited_by: string
  expires_at: string
  accepted_at: string | null
  created_at: string
  // joined
  project?: Project
  inviter?: User
}

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string
  link: string | null
  is_read: boolean
  created_at: string
}

export interface ProjectMember {
  id: string
  project_id: string
  user_id: string
  role: UserRole
  created_at: string
  user?: User
}

export const SCORE_CRITERIA = ['브랜드 스토리', '신뢰감', '각인 효과'] as const
export type ScoreCriterion = (typeof SCORE_CRITERIA)[number]

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  deadline_soon: true,
  new_comment: true,
  new_pin: false,
  result_open: true,
  analysis_done: true,
  approval_requested: true,
  approval_done: true,
  rejected: true,
}

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  draft: '임시저장',
  active: '진행 중',
  voting: '투표 중',
  approval: '승인 중',
  closed: '마감',
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: '관리자',
  reviewer: '참여자',
  approver: '승인자',
  viewer: '뷰어',
}
