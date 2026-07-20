import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Button } from '@/components/common/Button'
import { ProjectLNB, ProjectHeader } from '@/components/layout/ProjectLayout'
import { useAuthStore } from '@/stores/authStore'
import { useProjectStore } from '@/stores/projectStore'
import { localApi } from '@/lib/localDb'
import { toast } from '@/stores/toastStore'

const OPTIONS = [
  { key: 'votes', label: "투표 결과" },
  { key: 'ai', label: "AI 분석" },
  { key: 'pins', label: "핀 댓글 요약" },
  { key: 'approval', label: "승인 이력" },
  { key: 'members', label: "참여자 정보" },
] as const

export function ProjectReport() {
  const { id } = useParams<{ id: string }>()
  const user = useAuthStore((s) => s.user)
  const { currentProject, items, loadProject } = useProjectStore()
  const [selected, setSelected] = useState<string[]>(OPTIONS.map((o) => o.key))
  const [email, setEmail] = useState('')
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    if (id) loadProject(id)
  }, [id, loadProject])

  if (!currentProject || !user) return null
  const project = currentProject
  const analysis = localApi.getAnalysis(project.id)
  const votes = localApi.getVotes(project.id)
  const lines = localApi.getApprovalLines(project.id)
  const voteRate = project.vote_rate ?? 0

  const toggle = (key: string) => {
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  }

  const buildReportHtml = () => {
    let body = `<h1>${project.title}</h1><p>${"작성일"}: ${new Date().toLocaleDateString('ko-KR')}</p>`
    if (selected.includes('votes')) {
      body += `<h2>${"투표 결과"}</h2><ul>`
      for (const item of items) {
        body += `<li>${item.title}: ${item.vote_count ?? 0}${"표"} (${item.vote_rate ?? 0}%) ${"점"}${item.avg_score ?? 0}</li>`
      }
      body += `</ul><p>${"총 투표"}: ${votes.length}${"표"}</p>`
    }
    if (selected.includes('ai') && analysis) {
      body += `<h2>${"AI 분석"}</h2><p>${analysis.overall_summary}</p>`
    }
    if (selected.includes('pins')) {
      body += `<h2>${"핀 댓글 요약"}</h2><ul>`
      for (const item of items) {
        body += `<li>${item.title}: ${localApi.getPins(item.id).length}${"개"}</li>`
      }
      body += '</ul>'
    }
    if (selected.includes('approval')) {
      body += `<h2>${"승인 이력"}</h2><ul>`
      for (const line of lines) {
        for (const a of line.actions ?? []) {
          body += `<li>${line.step_name}: ${a.action}</li>`
        }
      }
      body += '</ul>'
    }
    if (selected.includes('members')) {
      body += `<h2>${"참여자 정보"}</h2><p>${project.member_count}${"명"}</p>`
    }
    return `<!DOCTYPE html><html><head><title>${project.title} ${"보고서"}</title>
      <style>body{font-family:sans-serif;padding:40px;max-width:800px;margin:auto}h1{color:#2563eb}</style>
      </head><body>${body}</body></html>`
  }

  const generatePdf = () => {
    if (voteRate < 50) toast.warning("투표율이 50% 미만입니다. 그래도 보고서를 생성할까요?")
    setGenerating(true)
    setTimeout(() => {
      const w = window.open('', '_blank')
      if (w) {
        w.document.write(buildReportHtml())
        w.document.close()
        w.print()
      }
      toast.success("보고서가 생성되었습니다")
      setGenerating(false)
    }, 400)
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col">
      <ProjectHeader project={project} />
      <ProjectLNB project={project} isAdmin={user.role === 'admin'} />
      <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-4 font-bold">{"포함 항목"}</h2>
          <div className="space-y-2">
            {OPTIONS.map((o) => (
              <label key={o.key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selected.includes(o.key)}
                  onChange={() => toggle(o.key)}
                />
                {o.label}
              </label>
            ))}
          </div>
          <div className="mt-6 flex flex-col gap-3">
            <Button loading={generating} onClick={generatePdf}>
              {"PDF 생성 · 미리보기"}
            </Button>
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-lg border border-border px-3 py-2 text-sm"
                placeholder={"이메일 주소"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button
                variant="secondary"
                onClick={() => {
                  if (!email.trim()) {
                    toast.error("이메일을 입력해주세요")
                    return
                  }
                  toast.success(`${email}${"에 보고서 전송을 예약했습니다 (데모)"}`)
                }}
              >
                {"전송"}
              </Button>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <h2 className="mb-4 font-bold">{"미리보기"}</h2>
          <h3 className="font-semibold text-accent">{project.title}</h3>
          {selected.includes('votes') && (
            <div className="mt-3">
              <p className="text-sm font-medium">{"투표 결과"}</p>
              <ul className="mt-1 space-y-1 text-sm text-ink-muted">
                {items.map((i) => (
                  <li key={i.id}>
                    {i.title}: {i.vote_count ?? 0}{"표"}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {selected.includes('ai') && analysis && (
            <div className="mt-3">
              <p className="text-sm font-medium">{"AI 분석"}</p>
              <p className="mt-1 line-clamp-4 text-sm text-ink-muted">{analysis.overall_summary}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
