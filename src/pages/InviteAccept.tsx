import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { ToastContainer } from '@/components/common/Toast'
import { useAuthStore } from '@/stores/authStore'
import { localApi } from '@/lib/localDb'
import { toast } from '@/stores/toastStore'
import type { Invitation } from '@/types'
import { ROLE_LABELS } from '@/types'

export function InviteAccept() {
  const { token } = useParams<{ token: string }>()
  const { user, login, init } = useAuthStore()
  const [inv, setInv] = useState<Invitation | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    init()
  }, [init])

  useEffect(() => {
    if (!token) return
    // workspace invite token or invitation token
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
      setInv(invitation)
      return
    }
    // workspace invite_token fallback
    const db = localApi
    void db
    setError('초대 링크가 유효하지 않습니다')
  }, [token, navigate])

  useEffect(() => {
    if (user && inv && token) {
      try {
        localApi.acceptInvitation(token, user.id)
        toast.success('초대가 수락되었습니다')
        if (inv.project_id) navigate(`/projects/${inv.project_id}`)
        else navigate('/dashboard')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '수락 실패')
      }
    }
  }, [user, inv, token, navigate])

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface px-4">
        <p className="text-ink-muted">{error}</p>
      </div>
    )
  }

  if (!inv) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface-raised p-8">
        <p className="mb-6 text-center font-display text-2xl">ApprovalOS</p>
        <div className="mb-6 rounded-xl bg-surface p-4 text-center">
          <p className="font-semibold">{inv.project?.title ?? '워크스페이스 초대'}</p>
          <p className="mt-1 text-sm text-ink-muted">
            {inv.inviter?.name ?? '관리자'}님이 초대했습니다
          </p>
          <p className="mt-1 text-sm">권한: {ROLE_LABELS[inv.role]}</p>
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
