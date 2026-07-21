import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { ToastContainer } from '@/components/common/Toast'
import { useAuthStore } from '@/stores/authStore'
import { localApi } from '@/lib/localDb'
import { toast } from '@/stores/toastStore'
import type { Invitation, Workspace } from '@/types'
import { ROLE_LABELS } from '@/types'

type InviteTarget =
  | { kind: 'invitation'; inv: Invitation }
  | { kind: 'workspace'; workspace: Workspace }

export function InviteAccept() {
  const { token } = useParams<{ token: string }>()
  const { user, login, init, refreshUser } = useAuthStore()
  const [target, setTarget] = useState<InviteTarget | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const acceptedRef = useRef(false)
  const navigate = useNavigate()

  useEffect(() => {
    init()
  }, [init])

  useEffect(() => {
    if (!token) return
    const invitation = localApi.getInvitation(token)
    if (invitation) {
      if (invitation.accepted_at) {
        if (invitation.project_id) navigate(`/projects/${invitation.project_id}`)
        else navigate('/dashboard')
        return
      }
      if (new Date(invitation.expires_at) < new Date()) {
        setError('초대 링크가 만료되었습니다. 관리자에게 재초대를 요청해주세요')
        return
      }
      setTarget({ kind: 'invitation', inv: invitation })
      return
    }
    const workspace = localApi.getWorkspaceByInviteToken(token)
    if (workspace) {
      setTarget({ kind: 'workspace', workspace })
      return
    }
    setError('초대 링크가 유효하지 않습니다')
  }, [token, navigate])

  useEffect(() => {
    if (!user || !target || !token || acceptedRef.current) return
    acceptedRef.current = true
    try {
      const result = localApi.acceptInviteToken(token, user.id)
      refreshUser()
      toast.success('초대가 수락되었습니다')
      if (result.projectId) navigate(`/projects/${result.projectId}`)
      else navigate('/dashboard')
    } catch (err) {
      acceptedRef.current = false
      toast.error(err instanceof Error ? err.message : '수락 실패')
    }
  }, [user, target, token, navigate, refreshUser])

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface px-4">
        <p className="text-ink-muted">{error}</p>
      </div>
    )
  }

  if (!target) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    )
  }

  const title =
    target.kind === 'invitation'
      ? (target.inv.project?.title ?? '워크스페이스 초대')
      : `${target.workspace.name} 초대`
  const subtitle =
    target.kind === 'invitation'
      ? `${target.inv.inviter?.name ?? '관리자'}님이 초대했습니다`
      : '워크스페이스 초대 링크로 참여합니다'
  const roleLabel =
    target.kind === 'invitation' ? ROLE_LABELS[target.inv.role] : ROLE_LABELS.reviewer

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface-raised p-8">
        <p className="mb-6 text-center font-display text-2xl">ApprovalOS</p>
        <div className="mb-6 rounded-xl bg-surface p-4 text-center">
          <p className="font-semibold">{title}</p>
          <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>
          <p className="mt-1 text-sm">권한: {roleLabel}</p>
          {target.kind === 'invitation' && (
            <p className="mt-1 text-xs text-ink-muted">초대 이메일: {target.inv.email}</p>
          )}
        </div>

        {!user && (
          <form
            className="flex flex-col gap-3"
            onSubmit={async (e) => {
              e.preventDefault()
              setLoading(true)
              try {
                await login(email, password)
              } catch (err) {
                toast.error(err instanceof Error ? err.message : '로그인 실패')
              } finally {
                setLoading(false)
              }
            }}
          >
            <Input label="이메일" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input
              label="비밀번호"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button type="submit" loading={loading} className="w-full">
              로그인 후 참여하기
            </Button>
          </form>
        )}

        <p className="mt-4 text-center text-sm text-ink-muted">
          아직 계정이 없으신가요?{' '}
          <Link to={`/signup?invite=${token}`} className="text-accent hover:underline">
            회원가입
          </Link>
        </p>
      </div>
      <ToastContainer />
    </div>
  )
}
