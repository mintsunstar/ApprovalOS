import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { useAdminStore } from '@/stores/adminStore'
import { OPS_CREDENTIALS } from '@/lib/localDb'
import { toast } from '@/stores/toastStore'

export function AdminLogin() {
  const [email, setEmail] = useState<string>(OPS_CREDENTIALS.email)
  const [password, setPassword] = useState<string>(OPS_CREDENTIALS.password)
  const [loading, setLoading] = useState(false)
  const login = useAdminStore((s) => s.login)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(email.trim(), password)
      toast.success('운영 콘솔에 로그인했습니다')
      navigate('/admin/dashboard')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '로그인 실패')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface-raised p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">ApprovalOS</p>
        <h1 className="mt-1 text-2xl font-semibold">운영 관리자 로그인</h1>
        <p className="mt-2 text-sm text-ink-muted">
          워크스페이스 관리자(users.role)와 별도의 플랫폼 운영 계정입니다.
        </p>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <Input label="이메일" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input
            label="비밀번호"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" className="w-full" loading={loading}>
            로그인
          </Button>
        </form>
        <p className="mt-4 rounded-lg bg-surface px-3 py-2 text-xs text-ink-muted">
          데모: {OPS_CREDENTIALS.email} / {OPS_CREDENTIALS.password}
        </p>
      </div>
    </div>
  )
}
