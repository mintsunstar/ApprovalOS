import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/common/Button'
import { Input, Select } from '@/components/common/Input'
import { ConfirmDialog } from '@/components/common/Modal'
import { ProjectLNB, ProjectHeader } from '@/components/layout/ProjectLayout'
import { useAuthStore } from '@/stores/authStore'
import { useProjectStore } from '@/stores/projectStore'
import { localApi } from '@/lib/localDb'
import { toast } from '@/stores/toastStore'
import type { VoteType } from '@/types'

export function ProjectSettings() {
  const { id } = useParams<{ id: string }>()
  const user = useAuthStore((s) => s.user)
  const { currentProject, loadProject } = useProjectStore()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [deadline, setDeadline] = useState('')
  const [voteType, setVoteType] = useState<VoteType>('combined')
  const [visibility, setVisibility] = useState<'internal' | 'link'>('internal')
  const [deleteOpen, setDeleteOpen] = useState(false)

  useEffect(() => {
    if (id) loadProject(id)
  }, [id, loadProject])

  useEffect(() => {
    if (currentProject) {
      setTitle(currentProject.title)
      setDeadline(currentProject.deadline.slice(0, 10))
      setVoteType(currentProject.vote_type)
      setVisibility(currentProject.visibility)
    }
  }, [currentProject])

  if (!currentProject || !user) return null
  if (user.role !== 'admin' && user.id !== currentProject.created_by) {
    navigate(`/projects/${id}`)
    return null
  }

  const project = currentProject

  const save = () => {
    localApi.updateProject(project.id, {
      title: title.trim(),
      deadline: new Date(deadline).toISOString(),
      vote_type: voteType,
      visibility,
      public_token:
        visibility === 'link'
          ? project.public_token ?? crypto.randomUUID().slice(0, 12)
          : null,
    })
    toast.success("저장되었습니다")
    loadProject(project.id)
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col">
      <ProjectHeader project={project} />
      <ProjectLNB project={project} isAdmin />
      <div className="mx-auto w-full max-w-lg space-y-4 p-6">
        <div className="card space-y-4 p-5">
          <Input label={"프로젝트명"} value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input
            label={"마감일"}
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
          <Select
            label={"투표 방식"}
            value={voteType}
            onChange={(e) => setVoteType(e.target.value as VoteType)}
            options={[
              { value: 'single', label: "단일 선택" },
              { value: 'rank', label: "순위 투표" },
              { value: 'score', label: "평가 점수" },
              { value: 'combined', label: "복합" },
            ]}
          />
          <Select
            label={"공개 범위"}
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as 'internal' | 'link')}
            options={[
              { value: 'internal', label: "내부만" },
              { value: 'link', label: "링크 공개" },
            ]}
          />
          {visibility === 'link' && project.public_token && (
            <div className="rounded-lg bg-accent-soft p-3 text-sm">
              {"공개 투표 링크:"}{' '}
              <code className="text-accent">/vote/{project.public_token}</code>
              <Button
                size="sm"
                variant="secondary"
                className="ml-2"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `${window.location.origin}/vote/${project.public_token}`
                  )
                  toast.success("복사됨")
                }}
              >
                {"복사"}
              </Button>
            </div>
          )}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={save}>{"저장"}</Button>
            {project.status !== 'closed' ? (
              <Button
                variant="secondary"
                onClick={() => {
                  if (confirm("프로젝트를 마감하시겠습니까?")) {
                    localApi.updateProject(project.id, { status: 'closed' })
                    toast.success("마감되었습니다")
                    loadProject(project.id)
                  }
                }}
              >
                {"지금 마감"}
              </Button>
            ) : (
              <Button
                variant="secondary"
                onClick={() => {
                  localApi.updateProject(project.id, { status: 'active' })
                  toast.success("다시 열었습니다")
                  loadProject(project.id)
                }}
              >
                {"다시 열기"}
              </Button>
            )}
          </div>
        </div>
        <button
          className="text-sm font-medium text-danger hover:underline"
          onClick={() => setDeleteOpen(true)}
        >
          {"프로젝트 삭제"}
        </button>
      </div>
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={"프로젝트 삭제"}
        description={"시안, 투표, 댓글이 모두 삭제됩니다. 이 작업은 되돌릴 수 없습니다."}
        confirmLabel={"삭제"}
        danger
        onConfirm={() => {
          localApi.deleteProject(project.id)
          toast.success("삭제되었습니다")
          navigate('/dashboard')
        }}
      />
    </div>
  )
}
