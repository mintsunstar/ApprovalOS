import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/common/Button'
import { ToastContainer } from '@/components/common/Toast'
import { useAuthStore } from '@/stores/authStore'
import { toast } from '@/stores/toastStore'

export function Landing() {
  const loginAsDev = useAuthStore((s) => s.loginAsDev)
  const navigate = useNavigate()

  const enterDev = async () => {
    try {
      await loginAsDev()
      toast.success('개발자 모드로 입장했습니다')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '입장 실패')
    }
  }

  return (
    <div className="min-h-screen bg-surface">
      <ToastContainer />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[70vh]"
        style={{
          background:
            'radial-gradient(ellipse 90% 55% at 50% -15%, #bfdbfe 0%, transparent 55%), linear-gradient(180deg, #eff6ff 0%, #f3f4f6 100%)',
        }}
      />
      <header className="relative z-10 mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-sm font-bold text-white">
            A
          </span>
          <span className="text-lg font-bold tracking-tight text-ink sm:text-xl">ApprovalOS</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={enterDev}>
            개발자 입장
          </Button>
          <Link to="/login">
            <Button variant="ghost" size="sm">
              로그인
            </Button>
          </Link>
          <Link to="/signup">
            <Button size="sm">시작하기</Button>
          </Link>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-4xl px-4 pb-16 pt-10 text-center sm:px-6 sm:pb-20 sm:pt-16">
        <p className="mb-4 text-sm font-semibold text-accent">Design Review · Approval Platform</p>
        <h1 className="text-4xl font-bold leading-tight tracking-tight text-ink sm:text-5xl md:text-6xl">
          ApprovalOS
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-ink-muted">
          모든 검토와 승인을 하나의 플랫폼에서. 시안 업로드부터 핀 댓글, 투표, AI 분석, 다단계 승인까지.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Button size="lg" onClick={enterDev}>
            개발자 모드로 입장
          </Button>
          <Link to="/login">
            <Button size="lg" variant="secondary">
              로그인
            </Button>
          </Link>
        </div>
        <p className="mt-4 text-xs text-ink-muted">
          개발 계정: developer@approvalos.dev / developer
        </p>
      </section>

      <section className="relative z-10 mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <h2 className="mb-8 text-center text-2xl font-bold">핵심 기능</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { title: '시안 업로드', desc: '버전 관리와 함께 디자인 결과물을 한곳에' },
            { title: '핀 댓글', desc: '이미지 위 정확한 위치에 피드백' },
            { title: 'AI 분석', desc: '의견·투표를 키워드와 감성으로 요약' },
            { title: '승인 워크플로우', desc: '1~5단계 커스텀 결재 라인' },
          ].map((f) => (
            <div key={f.title} className="card p-5">
              <h3 className="font-bold text-accent">{f.title}</h3>
              <p className="mt-2 text-sm text-ink-muted">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10 text-center">
        <h2 className="mb-6 text-2xl font-bold">워크플로우</h2>
        <div className="flex flex-wrap items-center justify-center gap-2 text-sm font-semibold">
          {['업로드', '의견', '투표', '승인', '보고서'].map((s, i) => (
            <span key={s} className="flex items-center gap-2">
              <span className="rounded-full bg-accent-soft px-4 py-2 text-accent">{s}</span>
              {i < 4 && <span className="text-ink-muted">→</span>}
            </span>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <h2 className="mb-8 text-center text-2xl font-bold">요금제</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { name: 'Free', price: '₩0', desc: '소규모 팀 시작용' },
            { name: 'Pro', price: '₩29,000', desc: '무제한 프로젝트 · AI 분석', highlight: true },
            { name: 'Enterprise', price: '문의', desc: 'SSO · 전담 지원' },
          ].map((p) => (
            <div
              key={p.name}
              className={`card p-6 text-center ${p.highlight ? 'border-accent ring-2 ring-accent/20' : ''}`}
            >
              <h3 className="font-bold">{p.name}</h3>
              <p className="mt-2 text-3xl font-bold text-accent">{p.price}</p>
              <p className="mt-2 text-sm text-ink-muted">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-ink-muted">
        <p>© 2026 ApprovalOS · 이용약관 · 개인정보처리방침</p>
      </footer>
    </div>
  )
}
