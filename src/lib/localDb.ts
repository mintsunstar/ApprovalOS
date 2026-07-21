import type {
  AIAnalysis,
  AdminActionType,
  AdminLog,
  AdminUser,
  ApprovalAction,
  ApprovalLine,
  Comment,
  DesignItem,
  Incident,
  Invitation,
  ItemVersion,
  Notice,
  Notification,
  PinComment,
  PlanLimitsMap,
  PlanType,
  Project,
  ProjectMember,
  SystemFlags,
  User,
  Vote,
  Workspace,
  NotificationPrefs,
} from '@/types'
import {
  DEFAULT_NOTIFICATION_PREFS,
  DEFAULT_PLAN_LIMITS,
  DEFAULT_SYSTEM_FLAGS,
} from '@/types'
import { putDataUrl } from '@/lib/fileStore'

const STORAGE_KEY = 'approvalos_db_v1'

/** 개발자 모드 계정 (로컬 데모용) */
export const DEV_CREDENTIALS = {
  email: 'developer@approvalos.dev',
  password: 'developer',
  name: '개발자',
} as const

/** 플랫폼 운영자 계정 (WS admin과 분리) */
export const OPS_CREDENTIALS = {
  email: 'ops@approvalos.local',
  password: 'operator',
  name: '운영관리자',
} as const

export interface LocalDB {
  workspaces: Workspace[]
  users: User[]
  projects: Project[]
  design_items: DesignItem[]
  item_versions: ItemVersion[]
  votes: Vote[]
  comments: Comment[]
  pin_comments: PinComment[]
  comment_likes: { id: string; comment_id: string; user_id: string; created_at: string }[]
  ai_analyses: AIAnalysis[]
  approval_lines: ApprovalLine[]
  approval_actions: ApprovalAction[]
  invitations: Invitation[]
  notifications: Notification[]
  project_members: ProjectMember[]
  session_user_id: string | null
  admin_users: AdminUser[]
  admin_session_id: string | null
  admin_logs: AdminLog[]
  notices: Notice[]
  incidents: Incident[]
  plan_limits: PlanLimitsMap
  system_flags: SystemFlags
}

function uid(): string {
  return crypto.randomUUID()
}

function now(): string {
  return new Date().toISOString()
}

function emptyDB(): LocalDB {
  return {
    workspaces: [],
    users: [],
    projects: [],
    design_items: [],
    item_versions: [],
    votes: [],
    comments: [],
    pin_comments: [],
    comment_likes: [],
    ai_analyses: [],
    approval_lines: [],
    approval_actions: [],
    invitations: [],
    notifications: [],
    project_members: [],
    session_user_id: null,
    admin_users: [],
    admin_session_id: null,
    admin_logs: [],
    notices: [],
    incidents: [],
    plan_limits: { ...DEFAULT_PLAN_LIMITS },
    system_flags: { ...DEFAULT_SYSTEM_FLAGS },
  }
}

function normalizeDB(db: LocalDB): LocalDB {
  if (!db.admin_users) db.admin_users = []
  if (db.admin_session_id === undefined) db.admin_session_id = null
  if (!db.admin_logs) db.admin_logs = []
  if (!db.notices) db.notices = []
  if (!db.incidents) db.incidents = []
  if (!db.plan_limits) db.plan_limits = { ...DEFAULT_PLAN_LIMITS }
  else {
    db.plan_limits = {
      free: { ...DEFAULT_PLAN_LIMITS.free, ...db.plan_limits.free },
      pro: { ...DEFAULT_PLAN_LIMITS.pro, ...db.plan_limits.pro },
      enterprise: { ...DEFAULT_PLAN_LIMITS.enterprise, ...db.plan_limits.enterprise },
    }
  }
  if (!db.system_flags) db.system_flags = { ...DEFAULT_SYSTEM_FLAGS }
  for (const w of db.workspaces) {
    if (!w.status) w.status = 'active'
  }
  for (const u of db.users) {
    if (!u.status) u.status = 'active'
  }
  return db
}

export function loadDB(): LocalDB {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return normalizeDB(JSON.parse(raw) as LocalDB)
  } catch {
    /* ignore */
  }
  return emptyDB()
}

function estimateSize(db: LocalDB): number {
  try {
    return new Blob([JSON.stringify(db)]).size
  } catch {
    return JSON.stringify(db).length
  }
}

function stripDataUrlsFromVersions(db: LocalDB): boolean {
  let stripped = false
  for (const v of db.item_versions) {
    if (v.file_url?.startsWith('data:')) {
      v.file_url = ''
      stripped = true
    }
    if (v.thumbnail_url?.startsWith('data:')) {
      v.thumbnail_url = v.file_url || ''
      stripped = true
    }
  }
  return stripped
}

/** Move base64 data URLs out of localStorage into IndexedDB (async, best-effort). */
export async function migrateBlobsToIndexedDb(): Promise<void> {
  const db = loadDB()
  let changed = false
  for (const v of db.item_versions) {
    if (v.file_url?.startsWith('data:')) {
      try {
        v.file_url = await putDataUrl(v.file_url)
        changed = true
      } catch {
        v.file_url = ''
        changed = true
      }
    }
    if (v.thumbnail_url?.startsWith('data:')) {
      try {
        v.thumbnail_url = await putDataUrl(v.thumbnail_url)
        changed = true
      } catch {
        v.thumbnail_url = v.file_url || ''
        changed = true
      }
    }
  }
  if (!changed) return
  try {
    saveDB(db)
  } catch {
    stripDataUrlsFromVersions(db)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
    } catch {
      /* ignore */
    }
  }
}

export function saveDB(db: LocalDB): void {
  const json = JSON.stringify(db)
  try {
    localStorage.setItem(STORAGE_KEY, json)
  } catch {
    // Drop leftover base64 blobs so metadata can still be saved
    if (stripDataUrlsFromVersions(db)) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
        return
      } catch {
        /* fall through */
      }
    }
    const sizeMb = (estimateSize(db) / (1024 * 1024)).toFixed(1)
    throw new Error(
      `브라우저 저장 공간이 부족합니다 (약 ${sizeMb}MB). 페이지를 새로고침한 뒤 다시 시도하거나, 설정에서 로컬 데이터를 정리해 주세요.`
    )
  }
}

export function mutateDB(fn: (db: LocalDB) => void): LocalDB {
  const db = loadDB()
  fn(db)
  saveDB(db)
  return db
}

export const localApi = {
  uid,
  now,

  getSessionUser(): User | null {
    const db = loadDB()
    if (!db.session_user_id) return null
    return db.users.find((u) => u.id === db.session_user_id) ?? null
  },

  signup(email: string, password: string, name: string): User {
    void password
    return mutateDB((db) => {
      if (db.users.some((u) => u.email === email)) {
        throw new Error('이미 가입된 이메일입니다')
      }
      const workspace: Workspace = {
        id: uid(),
        name: `${name}의 워크스페이스`,
        logo_url: null,
        plan: 'free',
        status: 'active',
        invite_token: uid().slice(0, 8),
        created_at: now(),
        updated_at: now(),
      }
      const user: User = {
        id: uid(),
        email,
        name,
        avatar_url: null,
        company: null,
        title: null,
        workspace_id: workspace.id,
        role: 'admin',
        status: 'active',
        notification_prefs: { ...DEFAULT_NOTIFICATION_PREFS },
        created_at: now(),
        updated_at: now(),
      }
      db.workspaces.push(workspace)
      db.users.push(user)
      db.session_user_id = user.id
    }).users.find((u) => u.email === email)!
  },

  login(email: string, password: string): User {
    void password
    const db = mutateDB((d) => {
      const user = d.users.find((u) => u.email === email)
      if (!user) throw new Error('가입하지 않은 이메일입니다')
      if (user.status === 'suspended') throw new Error('정지된 계정입니다. 관리자에게 문의하세요.')
      if (user.status === 'deleted') throw new Error('탈퇴한 계정입니다')
      if (user.workspace_id) {
        const ws = d.workspaces.find((w) => w.id === user.workspace_id)
        if (ws?.status === 'suspended') {
          throw new Error('워크스페이스가 정지되었습니다. 관리자에게 문의하세요.')
        }
      }
      d.session_user_id = user.id
    })
    return db.users.find((u) => u.email === email)!
  },

  logout(): void {
    mutateDB((db) => {
      db.session_user_id = null
    })
  },

  updateUser(userId: string, patch: Partial<User>): User {
    const db = mutateDB((d) => {
      const idx = d.users.findIndex((u) => u.id === userId)
      if (idx === -1) throw new Error('사용자를 찾을 수 없습니다')
      d.users[idx] = { ...d.users[idx], ...patch, updated_at: now() }
    })
    return db.users.find((u) => u.id === userId)!
  },

  getWorkspace(id: string): Workspace | null {
    return loadDB().workspaces.find((w) => w.id === id) ?? null
  },

  updateWorkspace(id: string, patch: Partial<Workspace>): Workspace {
    const db = mutateDB((d) => {
      const idx = d.workspaces.findIndex((w) => w.id === id)
      if (idx === -1) throw new Error('워크스페이스를 찾을 수 없습니다')
      d.workspaces[idx] = { ...d.workspaces[idx], ...patch, updated_at: now() }
    })
    return db.workspaces.find((w) => w.id === id)!
  },

  getWorkspaceMembers(workspaceId: string): User[] {
    return loadDB().users.filter((u) => u.workspace_id === workspaceId)
  },

  getProjects(workspaceId: string): Project[] {
    return loadDB()
      .projects.filter((p) => p.workspace_id === workspaceId)
      .map((p) => enrichProject(p))
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
  },

  getProject(id: string): Project | null {
    const p = loadDB().projects.find((x) => x.id === id)
    return p ? enrichProject(p) : null
  },

  createProject(data: Omit<Project, 'id' | 'created_at' | 'updated_at' | 'public_token'>): Project {
    const createdAt = now()
    const project: Project = {
      ...data,
      id: uid(),
      start_date: data.start_date ?? createdAt,
      public_token: data.visibility === 'link' ? uid().slice(0, 12) : null,
      created_at: createdAt,
      updated_at: createdAt,
    }
    mutateDB((db) => {
      db.projects.push(project)
      db.project_members.push({
        id: uid(),
        project_id: project.id,
        user_id: data.created_by,
        role: 'admin',
        created_at: createdAt,
      })
    })
    return enrichProject(project)
  },

  updateProject(id: string, patch: Partial<Project>): Project {
    const db = mutateDB((d) => {
      const idx = d.projects.findIndex((p) => p.id === id)
      if (idx === -1) throw new Error('프로젝트를 찾을 수 없습니다')
      const prev = d.projects[idx]
      const closing = patch.status === 'closed' && prev.status !== 'closed'
      d.projects[idx] = { ...prev, ...patch, updated_at: now() }
      if (closing) {
        notifyResultOpen(d, id)
      }
    })
    if (patch.status === 'closed') emitNotificationsChanged()
    return enrichProject(db.projects.find((p) => p.id === id)!)
  },

  deleteProject(id: string): void {
    mutateDB((db) => {
      db.projects = db.projects.filter((p) => p.id !== id)
      db.design_items = db.design_items.filter((i) => i.project_id !== id)
      db.votes = db.votes.filter((v) => v.project_id !== id)
      db.comments = db.comments.filter((c) => c.project_id !== id)
      db.approval_lines = db.approval_lines.filter((a) => a.project_id !== id)
      db.project_members = db.project_members.filter((m) => m.project_id !== id)
      db.ai_analyses = db.ai_analyses.filter((a) => a.project_id !== id)
    })
  },

  getItems(projectId: string): DesignItem[] {
    const db = loadDB()
    return db.design_items
      .filter((i) => i.project_id === projectId)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((item) => enrichItem(item, db))
  },

  getItem(id: string): DesignItem | null {
    const db = loadDB()
    const item = db.design_items.find((i) => i.id === id)
    return item ? enrichItem(item, db) : null
  },

  createItem(data: {
    project_id: string
    title: string
    keywords: string[]
    description: string | null
    file_url: string
    created_by: string
  }): DesignItem {
    let itemId = ''
    mutateDB((db) => {
      const order = db.design_items.filter((i) => i.project_id === data.project_id).length
      itemId = uid()
      const versionId = uid()
      const version: ItemVersion = {
        id: versionId,
        item_id: itemId,
        version_number: 1,
        file_url: data.file_url,
        thumbnail_url: data.file_url,
        change_note: '최초 업로드',
        created_by: data.created_by,
        created_at: now(),
      }
      const item: DesignItem = {
        id: itemId,
        project_id: data.project_id,
        title: data.title,
        keywords: data.keywords,
        description: data.description,
        sort_order: order,
        current_version_id: versionId,
        created_by: data.created_by,
        created_at: now(),
        updated_at: now(),
      }
      db.design_items.push(item)
      db.item_versions.push(version)
    })
    return this.getItem(itemId)!
  },

  updateItem(id: string, patch: Partial<DesignItem>): DesignItem {
    mutateDB((db) => {
      const idx = db.design_items.findIndex((i) => i.id === id)
      if (idx === -1) throw new Error('시안을 찾을 수 없습니다')
      db.design_items[idx] = { ...db.design_items[idx], ...patch, updated_at: now() }
    })
    return this.getItem(id)!
  },

  deleteItem(id: string): void {
    mutateDB((db) => {
      db.design_items = db.design_items.filter((i) => i.id !== id)
      db.item_versions = db.item_versions.filter((v) => v.item_id !== id)
      db.pin_comments = db.pin_comments.filter((p) => p.item_id !== id)
    })
  },

  addVersion(itemId: string, file_url: string, change_note: string | null, created_by: string): ItemVersion {
    let version: ItemVersion | null = null
    mutateDB((db) => {
      const item = db.design_items.find((i) => i.id === itemId)
      if (!item) throw new Error('시안을 찾을 수 없습니다')
      const maxVer = Math.max(0, ...db.item_versions.filter((v) => v.item_id === itemId).map((v) => v.version_number))
      version = {
        id: uid(),
        item_id: itemId,
        version_number: maxVer + 1,
        file_url,
        thumbnail_url: file_url,
        change_note,
        created_by,
        created_at: now(),
      }
      db.item_versions.push(version)
      item.current_version_id = version.id
      item.updated_at = now()
    })
    return version!
  },

  restoreVersion(itemId: string, versionId: string): void {
    mutateDB((db) => {
      const item = db.design_items.find((i) => i.id === itemId)
      const version = db.item_versions.find((v) => v.id === versionId)
      if (!item || !version) throw new Error('버전을 찾을 수 없습니다')
      item.current_version_id = versionId
      item.updated_at = now()
    })
  },

  getVotes(projectId: string): Vote[] {
    return loadDB().votes.filter((v) => v.project_id === projectId)
  },

  upsertVote(data: Omit<Vote, 'id' | 'created_at' | 'updated_at'>): Vote {
    let vote: Vote | null = null
    mutateDB((db) => {
      const existing = db.votes.find(
        (v) =>
          v.project_id === data.project_id &&
          ((data.user_id && v.user_id === data.user_id) ||
            (data.guest_name && v.guest_name === data.guest_name))
      )
      if (existing) {
        Object.assign(existing, data, { updated_at: now() })
        vote = existing
      } else {
        vote = { ...data, id: uid(), created_at: now(), updated_at: now() }
        db.votes.push(vote)
      }
    })
    return vote!
  },

  getComments(projectId: string): Comment[] {
    const db = loadDB()
    const comments = db.comments
      .filter((c) => c.project_id === projectId && !c.parent_id)
      .map((c) => enrichComment(c, db))
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
    return comments
  },

  createComment(data: Omit<Comment, 'id' | 'like_count' | 'created_at' | 'updated_at'>): Comment {
    const imageUrls = data.image_urls?.filter(Boolean) ?? []
    const comment: Comment = {
      ...data,
      content: data.content ?? '',
      image_urls: imageUrls,
      id: uid(),
      like_count: 0,
      created_at: now(),
      updated_at: now(),
    }
    mutateDB((db) => {
      db.comments.push(comment)
      const author = db.users.find((u) => u.id === data.user_id)
      const snippet = data.content.trim()
        ? data.content.length > 50
          ? `${data.content.slice(0, 50)}...`
          : data.content
        : imageUrls.length > 0
          ? `(이미지 ${imageUrls.length}장)`
          : '(내용 없음)'
      notifyAdmins(
        db,
        data.project_id,
        'new_comment',
        '새 댓글이 등록되었습니다',
        `${author?.name ?? '참여자'}: ${snippet}`,
        `/projects/${data.project_id}/comments`,
        data.user_id
      )
    })
    emitNotificationsChanged()
    return enrichComment(comment, loadDB())
  },

  toggleLike(commentId: string, userId: string): void {
    mutateDB((db) => {
      const existing = db.comment_likes.find((l) => l.comment_id === commentId && l.user_id === userId)
      const comment = db.comments.find((c) => c.id === commentId)
      if (!comment) return
      if (existing) {
        db.comment_likes = db.comment_likes.filter((l) => l.id !== existing.id)
        comment.like_count = Math.max(0, comment.like_count - 1)
      } else {
        db.comment_likes.push({ id: uid(), comment_id: commentId, user_id: userId, created_at: now() })
        comment.like_count += 1
      }
    })
  },

  getPins(itemId: string): PinComment[] {
    const db = loadDB()
    return db.pin_comments
      .filter((p) => p.item_id === itemId)
      .sort((a, b) => a.pin_number - b.pin_number)
      .map((p) => ({
        ...p,
        comment: db.comments.find((c) => c.id === p.comment_id)
          ? enrichComment(db.comments.find((c) => c.id === p.comment_id)!, db)
          : undefined,
      }))
  },

  createPin(data: {
    item_id: string
    version_id: string
    project_id: string
    user_id: string
    content: string
    pin_x: number
    pin_y: number
  }): PinComment {
    let pin: PinComment | null = null
    mutateDB((db) => {
      const pinNumber =
        Math.max(0, ...db.pin_comments.filter((p) => p.item_id === data.item_id).map((p) => p.pin_number)) + 1
      const comment: Comment = {
        id: uid(),
        project_id: data.project_id,
        user_id: data.user_id,
        content: data.content,
        type: 'pin',
        item_ids: [data.item_id],
        parent_id: null,
        like_count: 0,
        created_at: now(),
        updated_at: now(),
      }
      pin = {
        id: uid(),
        item_id: data.item_id,
        version_id: data.version_id,
        comment_id: comment.id,
        pin_x: data.pin_x,
        pin_y: data.pin_y,
        pin_number: pinNumber,
        is_resolved: false,
        page_number: null,
        created_at: now(),
      }
      db.comments.push(comment)
      db.pin_comments.push(pin)
      const author = db.users.find((u) => u.id === data.user_id)
      notifyAdmins(
        db,
        data.project_id,
        'new_pin',
        '새 핀 댓글이 등록되었습니다',
        `${author?.name ?? '참여자'}님이 시안에 핀을 추가했습니다.`,
        `/projects/${data.project_id}/items/${data.item_id}`,
        data.user_id
      )
    })
    emitNotificationsChanged()
    return this.getPins(data.item_id).find((p) => p.id === pin!.id)!
  },

  resolvePin(pinId: string, resolved: boolean): void {
    mutateDB((db) => {
      const pin = db.pin_comments.find((p) => p.id === pinId)
      if (pin) pin.is_resolved = resolved
    })
  },

  getAnalysis(projectId: string): AIAnalysis | null {
    return loadDB().ai_analyses.find((a) => a.project_id === projectId) ?? null
  },

  saveAnalysis(analysis: Omit<AIAnalysis, 'id' | 'created_at'>): AIAnalysis {
    let saved: AIAnalysis | null = null
    mutateDB((db) => {
      db.ai_analyses = db.ai_analyses.filter((a) => a.project_id !== analysis.project_id)
      saved = { ...analysis, id: uid(), created_at: now() }
      db.ai_analyses.push(saved)
      const project = db.projects.find((p) => p.id === analysis.project_id)
      notifyAdmins(
        db,
        analysis.project_id,
        'analysis_done',
        'AI 분석이 완료되었습니다',
        `${project?.title ?? '프로젝트'}의 AI 분석 결과를 확인하세요.`,
        `/projects/${analysis.project_id}/analysis`
      )
    })
    emitNotificationsChanged()
    return saved!
  },

  getApprovalLines(projectId: string): ApprovalLine[] {
    const db = loadDB()
    return db.approval_lines
      .filter((l) => l.project_id === projectId)
      .sort((a, b) => a.step_order - b.step_order)
      .map((line) => ({
        ...line,
        approvers: db.users.filter((u) => line.approver_ids.includes(u.id)),
        actions: db.approval_actions.filter((a) => a.approval_line_id === line.id),
      }))
  },

  setApprovalLines(
    projectId: string,
    lines: Omit<ApprovalLine, 'id' | 'created_at' | 'status' | 'project_id'>[]
  ): ApprovalLine[] {
    mutateDB((db) => {
      const oldIds = db.approval_lines.filter((l) => l.project_id === projectId).map((l) => l.id)
      db.approval_actions = db.approval_actions.filter((a) => !oldIds.includes(a.approval_line_id))
      db.approval_lines = db.approval_lines.filter((l) => l.project_id !== projectId)
      for (const line of lines) {
        db.approval_lines.push({
          ...line,
          id: uid(),
          project_id: projectId,
          status: 'pending',
          created_at: now(),
        })
      }
    })
    return this.getApprovalLines(projectId)
  },

  startApproval(projectId: string): void {
    mutateDB((db) => {
      const project = db.projects.find((p) => p.id === projectId)
      if (!project) return
      project.status = 'approval'
      project.updated_at = now()
      const lines = db.approval_lines
        .filter((l) => l.project_id === projectId)
        .sort((a, b) => a.step_order - b.step_order)
      for (const line of lines) line.status = 'pending'
      const first = lines[0]
      if (first) {
        first.status = 'active'
        for (const approverId of first.approver_ids) {
          pushNotification(db, {
            userId: approverId,
            type: 'approval_requested',
            title: '승인 요청이 도착했습니다',
            body: `${project.title} — ${first.step_name} 승인을 요청합니다.`,
            link: approvalReviewLink(projectId),
          })
        }
      }
    })
    emitNotificationsChanged()
  },

  submitApprovalAction(data: {
    approval_line_id: string
    user_id: string
    action: 'approved' | 'rejected'
    selected_item_id: string | null
    reject_reason: string | null
  }): void {
    mutateDB((db) => {
      const line = db.approval_lines.find((l) => l.id === data.approval_line_id)
      if (!line || line.status !== 'active') throw new Error('현재 승인할 수 없는 단계입니다')
      if (!line.approver_ids.includes(data.user_id)) throw new Error('승인 권한이 없습니다')

      const existing = db.approval_actions.find(
        (a) => a.approval_line_id === data.approval_line_id && a.user_id === data.user_id
      )
      if (existing) throw new Error('이미 처리한 승인 요청입니다')

      db.approval_actions.push({
        id: uid(),
        approval_line_id: data.approval_line_id,
        user_id: data.user_id,
        action: data.action,
        selected_item_id: data.selected_item_id,
        reject_reason: data.reject_reason,
        created_at: now(),
      })

      if (data.action === 'rejected') {
        line.status = 'rejected'
        const project = db.projects.find((p) => p.id === line.project_id)
        if (project) {
          project.status = 'active'
          project.updated_at = now()
        }
        notifyAdmins(
          db,
          line.project_id,
          'rejected',
          '승인이 반려되었습니다',
          data.reject_reason ?? '',
          approvalReviewLink(line.project_id),
          data.user_id
        )
        return
      }

      const actions = db.approval_actions.filter((a) => a.approval_line_id === line.id)
      const approvedCount = actions.filter((a) => a.action === 'approved').length
      const passed =
        line.approval_type === 'all'
          ? approvedCount === line.approver_ids.length
          : approvedCount > line.approver_ids.length / 2

      if (passed) {
        line.status = 'completed'
        const next = db.approval_lines
          .filter((l) => l.project_id === line.project_id)
          .sort((a, b) => a.step_order - b.step_order)
          .find((l) => l.step_order > line.step_order && l.status === 'pending')
        if (next) {
          next.status = 'active'
          const project = db.projects.find((p) => p.id === line.project_id)
          for (const approverId of next.approver_ids) {
            pushNotification(db, {
              userId: approverId,
              type: 'approval_requested',
              title: '승인 요청이 도착했습니다',
              body: `${project?.title ?? '프로젝트'} — ${next.step_name} 승인을 요청합니다.`,
              link: approvalReviewLink(line.project_id),
            })
          }
        } else {
          closeProjectAndNotify(db, line.project_id)
          notifyAdmins(
            db,
            line.project_id,
            'approval_done',
            '최종 승인이 완료되었습니다',
            '',
            approvalReviewLink(line.project_id),
            data.user_id
          )
        }
      }
    })
    emitNotificationsChanged()
  },

  restartApproval(projectId: string): void {
    mutateDB((db) => {
      const lines = db.approval_lines.filter((l) => l.project_id === projectId)
      const lineIds = lines.map((l) => l.id)
      db.approval_actions = db.approval_actions.filter((a) => !lineIds.includes(a.approval_line_id))
      for (const line of lines) line.status = 'pending'
      if (lines.length > 0) {
        const sorted = [...lines].sort((a, b) => a.step_order - b.step_order)
        sorted[0].status = 'active'
      }
      const project = db.projects.find((p) => p.id === projectId)
      if (project) {
        project.status = 'approval'
        project.updated_at = now()
      }
    })
  },

  getPendingApprovals(userId: string): { project: Project; line: ApprovalLine }[] {
    const db = loadDB()
    const result: { project: Project; line: ApprovalLine }[] = []
    for (const line of db.approval_lines) {
      if (line.status !== 'active') continue
      if (!line.approver_ids.includes(userId)) continue
      const already = db.approval_actions.some(
        (a) => a.approval_line_id === line.id && a.user_id === userId
      )
      if (already) continue
      const project = db.projects.find((p) => p.id === line.project_id)
      if (project) result.push({ project: enrichProject(project), line })
    }
    return result
  },

  createInvitation(data: Omit<Invitation, 'id' | 'token' | 'accepted_at' | 'created_at'>): Invitation {
    const inv: Invitation = {
      ...data,
      id: uid(),
      token: uid().slice(0, 16),
      accepted_at: null,
      created_at: now(),
    }
    mutateDB((db) => {
      db.invitations.push(inv)
    })
    return inv
  },

  getInvitation(token: string): Invitation | null {
    const db = loadDB()
    const inv = db.invitations.find((i) => i.token === token)
    if (!inv) return null
    return {
      ...inv,
      project: inv.project_id ? db.projects.find((p) => p.id === inv.project_id) : undefined,
      inviter: db.users.find((u) => u.id === inv.invited_by),
    }
  },

  getWorkspaceByInviteToken(token: string): Workspace | null {
    return loadDB().workspaces.find((w) => w.invite_token === token) ?? null
  },

  joinWorkspaceByInviteToken(token: string, userId: string): Workspace {
    return mutateDB((db) => {
      const ws = db.workspaces.find((w) => w.invite_token === token)
      if (!ws) throw new Error('초대 링크가 유효하지 않습니다')
      const user = db.users.find((u) => u.id === userId)
      if (!user) throw new Error('사용자를 찾을 수 없습니다')
      user.workspace_id = ws.id
      user.role = 'reviewer'
      user.updated_at = now()
    }).workspaces.find((w) => w.invite_token === token)!
  },

  acceptInvitation(token: string, userId: string): void {
    mutateDB((db) => {
      const inv = db.invitations.find((i) => i.token === token)
      if (!inv) throw new Error('초대 링크가 유효하지 않습니다')
      if (inv.accepted_at) throw new Error('이미 수락된 초대입니다')
      if (new Date(inv.expires_at) < new Date()) throw new Error('초대 링크가 만료되었습니다')
      const user = db.users.find((u) => u.id === userId)
      if (!user) throw new Error('사용자를 찾을 수 없습니다')
      if (inv.email && user.email.toLowerCase() !== inv.email.toLowerCase()) {
        throw new Error('초대받은 이메일과 다른 계정입니다')
      }
      inv.accepted_at = now()
      user.workspace_id = inv.workspace_id
      user.role = inv.role
      user.updated_at = now()
      if (inv.project_id) {
        const exists = db.project_members.some(
          (m) => m.project_id === inv.project_id && m.user_id === userId
        )
        if (!exists) {
          db.project_members.push({
            id: uid(),
            project_id: inv.project_id,
            user_id: userId,
            role: inv.role,
            created_at: now(),
          })
        }
      }
    })
  },

  /** invitations token 또는 workspace.invite_token */
  acceptInviteToken(token: string, userId: string): { kind: 'invitation' | 'workspace'; projectId: string | null } {
    const invitation = this.getInvitation(token)
    if (invitation) {
      this.acceptInvitation(token, userId)
      return { kind: 'invitation', projectId: invitation.project_id }
    }
    const ws = this.getWorkspaceByInviteToken(token)
    if (ws) {
      this.joinWorkspaceByInviteToken(token, userId)
      return { kind: 'workspace', projectId: null }
    }
    throw new Error('초대 링크가 유효하지 않습니다')
  },

  getPendingInvitations(workspaceId: string): Invitation[] {
    const db = loadDB()
    const nowMs = Date.now()
    return db.invitations
      .filter(
        (i) =>
          i.workspace_id === workspaceId &&
          !i.accepted_at &&
          new Date(i.expires_at).getTime() > nowMs
      )
      .map((inv) => ({
        ...inv,
        project: inv.project_id ? db.projects.find((p) => p.id === inv.project_id) : undefined,
        inviter: db.users.find((u) => u.id === inv.invited_by),
      }))
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
  },

  cancelInvitation(id: string): void {
    mutateDB((db) => {
      db.invitations = db.invitations.filter((i) => i.id !== id)
    })
  },

  removeWorkspaceMember(userId: string, workspaceId: string): void {
    mutateDB((db) => {
      const user = db.users.find((u) => u.id === userId)
      if (!user) throw new Error('사용자를 찾을 수 없습니다')
      user.workspace_id = null
      user.updated_at = now()
      const wsProjectIds = db.projects
        .filter((p) => p.workspace_id === workspaceId)
        .map((p) => p.id)
      db.project_members = db.project_members.filter(
        (m) => !(m.user_id === userId && wsProjectIds.includes(m.project_id))
      )
      db.invitations = db.invitations.filter(
        (i) =>
          !(
            i.workspace_id === workspaceId &&
            !i.accepted_at &&
            i.email.toLowerCase() === user.email.toLowerCase()
          )
      )
    })
  },

  getNotifications(userId: string): Notification[] {
    return loadDB()
      .notifications.filter((n) => n.user_id === userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
  },

  markNotificationRead(id: string): void {
    mutateDB((db) => {
      const n = db.notifications.find((x) => x.id === id)
      if (n) n.is_read = true
    })
  },

  markAllNotificationsRead(userId: string): void {
    mutateDB((db) => {
      for (const n of db.notifications) {
        if (n.user_id === userId) n.is_read = true
      }
    })
  },

  getProjectByPublicToken(token: string): Project | null {
    const p = loadDB().projects.find((x) => x.public_token === token)
    return p ? enrichProject(p) : null
  },

  seedDemoIfEmpty(): void {
    this.ensureDevAccount()
    this.ensureOpsAccount()
  },

  /** 개발자 계정이 없으면 생성 (이미 있으면 그대로) */
  ensureDevAccount(): User {
    const db = loadDB()
    const existing = db.users.find((u) => u.email === DEV_CREDENTIALS.email)
    if (existing) return existing

    return mutateDB((d) => {
      const workspace: Workspace = {
        id: uid(),
        name: '개발자 워크스페이스',
        logo_url: null,
        plan: 'free',
        status: 'active',
        invite_token: uid().slice(0, 8),
        created_at: now(),
        updated_at: now(),
      }
      const user: User = {
        id: uid(),
        email: DEV_CREDENTIALS.email,
        name: DEV_CREDENTIALS.name,
        avatar_url: null,
        company: 'ApprovalOS',
        title: 'Developer',
        workspace_id: workspace.id,
        role: 'admin',
        status: 'active',
        notification_prefs: { ...DEFAULT_NOTIFICATION_PREFS },
        created_at: now(),
        updated_at: now(),
      }
      d.workspaces.push(workspace)
      d.users.push(user)
    }).users.find((u) => u.email === DEV_CREDENTIALS.email)!
  },

  /** 회원가입 없이 개발자 모드로 세션 시작 */
  loginAsDev(): User {
    this.ensureDevAccount()
    return this.login(DEV_CREDENTIALS.email, DEV_CREDENTIALS.password)
  },

  updateNotificationPrefs(userId: string, prefs: NotificationPrefs): void {
    this.updateUser(userId, { notification_prefs: prefs })
  },

  // ─── Platform Admin (super_admin / admin_users) ───

  ensureOpsAccount(): AdminUser {
    const db = loadDB()
    const existing = db.admin_users.find((a) => a.email === OPS_CREDENTIALS.email)
    if (existing) return existing
    return mutateDB((d) => {
      d.admin_users.push({
        id: uid(),
        email: OPS_CREDENTIALS.email,
        name: OPS_CREDENTIALS.name,
        password: OPS_CREDENTIALS.password,
        failed_attempts: 0,
        locked_until: null,
        created_at: now(),
      })
    }).admin_users.find((a) => a.email === OPS_CREDENTIALS.email)!
  },

  getAdminSession(): AdminUser | null {
    const db = loadDB()
    if (!db.admin_session_id) return null
    return db.admin_users.find((a) => a.id === db.admin_session_id) ?? null
  },

  adminLogin(email: string, password: string): AdminUser {
    this.ensureOpsAccount()
    const db = mutateDB((d) => {
      const admin = d.admin_users.find((a) => a.email === email)
      if (!admin) throw new Error('운영자 계정이 없습니다')
      if (admin.locked_until && new Date(admin.locked_until) > new Date()) {
        throw new Error('계정이 잠겼습니다. 잠시 후 다시 시도하세요.')
      }
      if (admin.password !== password) {
        admin.failed_attempts += 1
        if (admin.failed_attempts >= 5) {
          admin.locked_until = new Date(Date.now() + 15 * 60 * 1000).toISOString()
          admin.failed_attempts = 0
          throw new Error('비밀번호 오류가 많아 15분간 잠겼습니다')
        }
        throw new Error('이메일 또는 비밀번호가 올바르지 않습니다')
      }
      admin.failed_attempts = 0
      admin.locked_until = null
      d.admin_session_id = admin.id
      pushAdminLog(d, admin.id, 'login', null, null, '운영 콘솔 로그인')
    })
    return db.admin_users.find((a) => a.email === email)!
  },

  adminLogout(): void {
    mutateDB((db) => {
      if (db.admin_session_id) {
        pushAdminLog(db, db.admin_session_id, 'logout', null, null, '운영 콘솔 로그아웃')
      }
      db.admin_session_id = null
    })
  },

  getPlanLimits(): PlanLimitsMap {
    return loadDB().plan_limits
  },

  getPlanLimit(plan: PlanType) {
    return loadDB().plan_limits[plan] ?? DEFAULT_PLAN_LIMITS[plan]
  },

  updatePlanLimits(limits: PlanLimitsMap, adminId: string): PlanLimitsMap {
    return mutateDB((db) => {
      db.plan_limits = limits
      pushAdminLog(db, adminId, 'plan_limits_update', 'plan_limits', null, '플랜 한도 수정')
    }).plan_limits
  },

  getSystemFlags(): SystemFlags {
    return loadDB().system_flags
  },

  setMaintenance(
    enabled: boolean,
    message: string,
    until: string | null,
    adminId: string
  ): SystemFlags {
    return mutateDB((db) => {
      db.system_flags = {
        maintenance: enabled,
        maintenance_message: message,
        maintenance_until: until,
      }
      pushAdminLog(
        db,
        adminId,
        'maintenance_toggle',
        'system',
        null,
        enabled ? `점검 모드 ON: ${message}` : '점검 모드 OFF'
      )
    }).system_flags
  },

  getAdminDashboardStats() {
    const db = loadDB()
    const activeWs = db.workspaces.filter((w) => w.status !== 'deleted')
    const activeUsers = db.users.filter((u) => u.status !== 'deleted')
    return {
      workspace_count: activeWs.length,
      user_count: activeUsers.length,
      project_count: db.projects.length,
      suspended_workspaces: db.workspaces.filter((w) => w.status === 'suspended').length,
      suspended_users: db.users.filter((u) => u.status === 'suspended').length,
      open_incidents: db.incidents.filter((i) => i.status !== 'resolved').length,
      published_notices: db.notices.filter((n) => n.status === 'published').length,
      maintenance: db.system_flags.maintenance,
    }
  },

  listAdminWorkspaces() {
    const db = loadDB()
    return db.workspaces
      .filter((w) => w.status !== 'deleted')
      .map((w) => ({
        ...w,
        member_count: db.users.filter((u) => u.workspace_id === w.id && u.status !== 'deleted')
          .length,
        project_count: db.projects.filter((p) => p.workspace_id === w.id).length,
      }))
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
  },

  getAdminWorkspace(id: string) {
    const db = loadDB()
    const w = db.workspaces.find((x) => x.id === id)
    if (!w) return null
    return {
      ...w,
      members: db.users.filter((u) => u.workspace_id === id && u.status !== 'deleted'),
      projects: db.projects.filter((p) => p.workspace_id === id),
    }
  },

  setWorkspaceStatus(
    id: string,
    status: 'active' | 'suspended',
    adminId: string
  ): Workspace {
    return mutateDB((db) => {
      const w = db.workspaces.find((x) => x.id === id)
      if (!w) throw new Error('워크스페이스를 찾을 수 없습니다')
      w.status = status
      w.updated_at = now()
      pushAdminLog(
        db,
        adminId,
        status === 'suspended' ? 'workspace_suspend' : 'workspace_unsuspend',
        'workspace',
        id,
        `${w.name} → ${status}`
      )
    }).workspaces.find((w) => w.id === id)!
  },

  setWorkspacePlan(id: string, plan: PlanType, adminId: string): Workspace {
    return mutateDB((db) => {
      const w = db.workspaces.find((x) => x.id === id)
      if (!w) throw new Error('워크스페이스를 찾을 수 없습니다')
      const prev = w.plan
      w.plan = plan
      w.updated_at = now()
      pushAdminLog(
        db,
        adminId,
        'workspace_plan_change',
        'workspace',
        id,
        `${w.name}: ${prev} → ${plan}`
      )
    }).workspaces.find((w) => w.id === id)!
  },

  listAdminUsers() {
    return loadDB()
      .users.filter((u) => u.status !== 'deleted')
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
  },

  getAdminUser(id: string) {
    return loadDB().users.find((u) => u.id === id) ?? null
  },

  setUserStatus(id: string, status: 'active' | 'suspended', adminId: string): User {
    return mutateDB((db) => {
      const u = db.users.find((x) => x.id === id)
      if (!u) throw new Error('사용자를 찾을 수 없습니다')
      u.status = status
      u.updated_at = now()
      if (status === 'suspended' && db.session_user_id === id) {
        db.session_user_id = null
      }
      pushAdminLog(
        db,
        adminId,
        status === 'suspended' ? 'user_suspend' : 'user_unsuspend',
        'user',
        id,
        `${u.email} → ${status}`
      )
    }).users.find((u) => u.id === id)!
  },

  forceDeleteUser(id: string, adminId: string): void {
    mutateDB((db) => {
      const u = db.users.find((x) => x.id === id)
      if (!u) throw new Error('사용자를 찾을 수 없습니다')
      u.status = 'deleted'
      u.workspace_id = null
      u.updated_at = now()
      if (db.session_user_id === id) db.session_user_id = null
      db.project_members = db.project_members.filter((m) => m.user_id !== id)
      pushAdminLog(db, adminId, 'user_force_delete', 'user', id, `${u.email} 강제 탈퇴`)
    })
  },

  stubResetPassword(id: string, adminId: string): void {
    mutateDB((db) => {
      const u = db.users.find((x) => x.id === id)
      if (!u) throw new Error('사용자를 찾을 수 없습니다')
      pushAdminLog(
        db,
        adminId,
        'user_reset_password',
        'user',
        id,
        `${u.email} 비밀번호 초기화 (메일 stub)`
      )
    })
  },

  listNotices(): Notice[] {
    return [...loadDB().notices].sort((a, b) => b.created_at.localeCompare(a.created_at))
  },

  getActiveBannerNotice(): Notice | null {
    const nowIso = now()
    return (
      loadDB().notices.find((n) => {
        if (n.status !== 'published' || n.type !== 'banner') return false
        if (n.starts_at && n.starts_at > nowIso) return false
        if (n.ends_at && n.ends_at < nowIso) return false
        return true
      }) ?? null
    )
  },

  getNotice(id: string): Notice | null {
    return loadDB().notices.find((n) => n.id === id) ?? null
  },

  createNotice(
    data: {
      title: string
      body: string
      type: Notice['type']
      starts_at?: string | null
      ends_at?: string | null
    },
    adminId: string
  ): Notice {
    let created: Notice | null = null
    mutateDB((db) => {
      created = {
        id: uid(),
        title: data.title,
        body: data.body,
        type: data.type,
        status: 'draft',
        starts_at: data.starts_at ?? null,
        ends_at: data.ends_at ?? null,
        created_by: adminId,
        created_at: now(),
        updated_at: now(),
      }
      db.notices.push(created)
      pushAdminLog(db, adminId, 'notice_create', 'notice', created.id, data.title)
    })
    return created!
  },

  updateNotice(
    id: string,
    patch: Partial<Pick<Notice, 'title' | 'body' | 'type' | 'starts_at' | 'ends_at' | 'status'>>,
    adminId: string
  ): Notice {
    return mutateDB((db) => {
      const n = db.notices.find((x) => x.id === id)
      if (!n) throw new Error('공지를 찾을 수 없습니다')
      Object.assign(n, patch, { updated_at: now() })
      if (patch.status === 'published') {
        pushAdminLog(db, adminId, 'notice_publish', 'notice', id, n.title)
      } else if (patch.status === 'archived') {
        pushAdminLog(db, adminId, 'notice_archive', 'notice', id, n.title)
      }
    }).notices.find((n) => n.id === id)!
  },

  listIncidents(): Incident[] {
    return [...loadDB().incidents].sort((a, b) => b.created_at.localeCompare(a.created_at))
  },

  createIncident(
    data: {
      title: string
      summary: string
      severity: Incident['severity']
    },
    adminId: string
  ): Incident {
    let created: Incident | null = null
    mutateDB((db) => {
      created = {
        id: uid(),
        title: data.title,
        summary: data.summary,
        severity: data.severity,
        status: 'investigating',
        started_at: now(),
        resolved_at: null,
        created_by: adminId,
        created_at: now(),
        updated_at: now(),
      }
      db.incidents.push(created)
      pushAdminLog(db, adminId, 'incident_create', 'incident', created.id, data.title)
    })
    return created!
  },

  updateIncident(
    id: string,
    patch: Partial<Pick<Incident, 'title' | 'summary' | 'severity' | 'status'>>,
    adminId: string
  ): Incident {
    return mutateDB((db) => {
      const inc = db.incidents.find((x) => x.id === id)
      if (!inc) throw new Error('점검을 찾을 수 없습니다')
      Object.assign(inc, patch, { updated_at: now() })
      if (patch.status === 'resolved') inc.resolved_at = now()
      pushAdminLog(db, adminId, 'incident_update', 'incident', id, `${inc.title} → ${inc.status}`)
    }).incidents.find((i) => i.id === id)!
  },

  listAdminLogs(limit = 100): AdminLog[] {
    const db = loadDB()
    return [...db.admin_logs]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, limit)
      .map((log) => ({
        ...log,
        admin: db.admin_users.find((a) => a.id === log.admin_user_id),
      }))
  },
}

function pushAdminLog(
  db: LocalDB,
  adminUserId: string,
  action: AdminActionType,
  targetType: string | null,
  targetId: string | null,
  detail: string
): void {
  db.admin_logs.push({
    id: uid(),
    admin_user_id: adminUserId,
    action,
    target_type: targetType,
    target_id: targetId,
    detail,
    created_at: now(),
  })
}

function enrichProject(p: Project): Project {
  const db = loadDB()
  const items = db.design_items.filter((i) => i.project_id === p.id)
  const members = db.project_members.filter((m) => m.project_id === p.id)
  const votes = db.votes.filter((v) => v.project_id === p.id)
  const lines = db.approval_lines
    .filter((l) => l.project_id === p.id)
    .sort((a, b) => a.step_order - b.step_order)
  const currentIdx = lines.findIndex((l) => l.status === 'active')
  return {
    ...p,
    items: items.map((i) => enrichItem(i, db)),
    member_count: members.length || 1,
    vote_rate: members.length > 0 ? Math.round((votes.length / Math.max(members.length, 1)) * 100) : 0,
    current_approval_step: currentIdx >= 0 ? currentIdx + 1 : lines.filter((l) => l.status === 'completed').length,
    total_approval_steps: lines.length,
  }
}

function enrichItem(item: DesignItem, db: LocalDB): DesignItem {
  const versions = db.item_versions
    .filter((v) => v.item_id === item.id)
    .sort((a, b) => b.version_number - a.version_number)
  const current = versions.find((v) => v.id === item.current_version_id) ?? versions[0]
  const votes = db.votes.filter((v) => {
    const project = db.projects.find((p) => p.id === item.project_id)
    return project && v.project_id === item.project_id
  })
  const vote_count = votes.filter(
    (v) => v.selected_item_ids.includes(item.id) || v.rankings.includes(item.id)
  ).length
  const pin_count = db.pin_comments.filter((p) => p.item_id === item.id && !p.is_resolved).length
  let scoreSum = 0
  let scoreN = 0
  for (const v of votes) {
    const s = v.scores[item.id]
    if (s) {
      const vals = Object.values(s)
      if (vals.length) {
        scoreSum += vals.reduce((a, b) => a + b, 0) / vals.length
        scoreN++
      }
    }
  }
  return {
    ...item,
    versions,
    current_version: current,
    vote_count,
    vote_rate: votes.length > 0 ? Math.round((vote_count / votes.length) * 100) : 0,
    avg_score: scoreN > 0 ? Math.round((scoreSum / scoreN) * 10) / 10 : 0,
    pin_count,
  }
}

function enrichComment(c: Comment, db: LocalDB): Comment {
  const user = db.users.find((u) => u.id === c.user_id)
  const sessionId = db.session_user_id
  const liked_by_me = sessionId
    ? db.comment_likes.some((l) => l.comment_id === c.id && l.user_id === sessionId)
    : false
  const replies = db.comments
    .filter((r) => r.parent_id === c.id)
    .map((r) => enrichComment(r, db))
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
  return { ...c, user, liked_by_me, replies }
}

function mergedPrefs(user: User): NotificationPrefs {
  return { ...DEFAULT_NOTIFICATION_PREFS, ...user.notification_prefs }
}

function shouldNotify(user: User, type: Notification['type']): boolean {
  const prefs = mergedPrefs(user)
  return prefs[type] !== false
}

function emitNotificationsChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('approvalos:notifications-changed'))
  }
}

function pushNotification(
  db: LocalDB,
  data: {
    userId: string
    type: Notification['type']
    title: string
    body: string
    link: string | null
  }
): void {
  const user = db.users.find((u) => u.id === data.userId)
  if (!user || !shouldNotify(user, data.type)) return
  db.notifications.push({
    id: uid(),
    user_id: data.userId,
    type: data.type,
    title: data.title,
    body: data.body,
    link: data.link,
    is_read: false,
    created_at: now(),
  })
}

function notifyAdmins(
  db: LocalDB,
  projectId: string,
  type: Notification['type'],
  title: string,
  body: string,
  link?: string,
  actorId?: string
): void {
  const project = db.projects.find((p) => p.id === projectId)
  if (!project) return
  const admins = db.users.filter(
    (u) => u.workspace_id === project.workspace_id && u.role === 'admin' && u.id !== actorId
  )
  const resolvedLink = link ?? `/projects/${projectId}`
  for (const admin of admins) {
    pushNotification(db, {
      userId: admin.id,
      type,
      title,
      body,
      link: resolvedLink,
    })
  }
}

function notifyResultOpen(db: LocalDB, projectId: string): void {
  const project = db.projects.find((p) => p.id === projectId)
  if (!project) return
  const members = db.project_members.filter((m) => m.project_id === projectId)
  for (const member of members) {
    pushNotification(db, {
      userId: member.user_id,
      type: 'result_open',
      title: '결과가 공개되었습니다',
      body: `${project.title}의 결과를 확인하세요.`,
      link: `/projects/${projectId}`,
    })
  }
}

function closeProjectAndNotify(db: LocalDB, projectId: string): void {
  const project = db.projects.find((p) => p.id === projectId)
  if (!project || project.status === 'closed') return
  project.status = 'closed'
  project.updated_at = now()
  notifyResultOpen(db, projectId)
}

function approvalReviewLink(projectId: string): string {
  return `/projects/${projectId}/approval/review`
}
