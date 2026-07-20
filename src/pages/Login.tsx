import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { useAuthStore } from '@/stores/authStore'
import { toast } from '@/stores/toastStore'
import { DEV_CREDENTIALS } from '@/lib/localDb'

export function Login() {
  const [email, setEmail] = useState<string>(DEV_CREDENTIALS.email)
  const [password, setPassword] = useState<string>(DEV_CREDENTIALS.password)
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [devLoading, setDevLoading] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const login = useAuthStore((s) => s.login)
  const loginAsDev = useAuthStore((s) => s.loginAsDev)
  const navigate = useNavigate()

  const validate = () => {
    const e: typeof errors = {}
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = '올바른 이메일 형식을 입력해주세요'
    if (password.length < 8) e.password = '비밀번호는 8자 이상이어야 합니다'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      await login(email, password)
      toast.success('로그인되었습니다')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '로그인에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleDevLogin = async () => {
    setDevLoading(true)
    try {
      await loginAsDev()
      toast.success('개발자 모드로 입장했습니다')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '개발자 로그인 실패')
    } finally {
      setDevLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-surface-raised p-8 shadow-sm">
      <h1 className="mb-6 text-center text-xl font-semibold">로그인</h1>

      <div className="mb-6 rounded-xl border border-accent/30 bg-accent-soft/60 p-4 text-sm">
        <p className="font-medium text-accent">개발자 모드</p>
        <p className="mt-1 text-ink-muted">
          이메일: <code className="text-ink">{DEV_CREDENTIALS.email}</code>
        </p>
        <p className="text-ink-muted">
          비밀번호: <code className="text-ink">{DEV_CREDENTIALS.password}</code>
        </p>
        <Button
          type="button"
          className="mt-3 w-full"
          variant="secondary"
          loading={devLoading}
          onClick={handleDevLogin}
        >
          개발자 모드로 바로 입장
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="이메일"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          placeholder="you@company.com"
        />
        <div className="relative">
          <Input
            label="비밀번호"
            type={showPw ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            placeholder="8자 이상"
          />
          <button
            type="button"
            className="absolute right-3 top-8 text-xs text-ink-muted"
            onClick={() => setShowPw(!showPw)}
          >
            {showPw ? '숨김' : '표시'}
          </button>
        </div>
        <Button type="submit" loading={loading} className="mt-2 w-full" size="lg">
          로그인
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-muted">
        계정이 없으신가요?{' '}
        <Link to="/signup" className="font-medium text-accent hover:underline">
          회원가입
        </Link>
      </p>
    </div>
  )
}

export function Signup() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string; name?: string }>({})
  const signup = useAuthStore((s) => s.signup)
  const navigate = useNavigate()

  const validate = () => {
    const e: typeof errors = {}
    if (name.trim().length < 2) e.name = '이름은 2자 이상이어야 합니다'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = '올바른 이메일 형식을 입력해주세요'
    if (password.length < 8) e.password = '비밀번호는 8자 이상이어야 합니다'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      await signup(email, password, name.trim())
      toast.success('회원가입이 완료되었습니다')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '회원가입에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-surface-raised p-8 shadow-sm">
      <h1 className="mb-6 text-center text-xl font-semibold">회원가입</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input label="이름" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
        <Input
          label="이메일"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
        />
        <Input
          label="비밀번호"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          placeholder="8자 이상"
        />
        <Button type="submit" loading={loading} className="mt-2 w-full" size="lg">
          가입하기
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-muted">
        이미 계정이 있으신가요?{' '}
        <Link to="/login" className="font-medium text-accent hover:underline">
          로그인
        </Link>
      </p>
    </div>
  )
}
