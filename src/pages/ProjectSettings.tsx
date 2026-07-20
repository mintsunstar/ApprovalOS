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
    toast.success('???????')
    loadProject(project.id)
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col">
      <ProjectHeader project={project} />
      <ProjectLNB project={project} isAdmin />
      <div className="mx-auto w-full max-w-lg space-y-4 p-6">
        <div className="card space-y-4 p-5">
          <Input label="?????" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input
            label="???"
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
          <Select
            label="?? ??"
            value={voteType}
            onChange={(e) => setVoteType(e.target.value as VoteType)}
            options={[
              { value: 'single', label: '?? ??' },
              { value: 'rank', label: '?? ???' },
              { value: 'score', label: '??? ??' },
              { value: 'combined', label: '??' },
            ]}
          />
          <Select
            label="?? ??"
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as 'internal' | 'link')}
            options={[
              { value: 'internal', label: '???' },
              { value: 'link', label: '?? ??' },
            ]}
          />
          {visibility === 'link' && project.public_token && (
            <div className="rounded-lg bg-accent-soft p-3 text-sm">
              ?? ?? ??:{' '}
              <code className="text-accent">/vote/{project.public_token}</code>
              <Button
                size="sm"
                variant="secondary"
                className="ml-2"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `${window.location.origin}/vote/${project.public_token}`
                  )
                  toast.success('???')
                }}
              >
                ??
              </Button>
            </div>
          )}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={save}>??</Button>
            {project.status !== 'closed' ? (
              <Button
                variant="secondary"
                onClick={() => {
                  if (confirm('????? ?????????')) {
                    localApi.updateProject(project.id, { status: 'closed' })
                    toast.success('???????')
                    loadProject(project.id)
                  }
                }}
              >
                ?? ??
              </Button>
            ) : (
              <Button
                variant="secondary"
                onClick={() => {
                  localApi.updateProject(project.id, { status: 'active' })
                  toast.success('????????')
                  loadProject(project.id)
                }}
              >
                ???
              </Button>
            )}
          </div>
        </div>
        <button
          className="text-sm font-medium text-danger hover:underline"
          onClick={() => setDeleteOpen(true)}
        >
          ???? ??
        </button>
      </div>
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="???? ??"
        description="?? ??, ??, ??? ?????. ? ??? ??? ? ????."
        confirmLabel="??"
        danger
        onConfirm={() => {
          localApi.deleteProject(project.id)
          toast.success('???????')
          navigate('/dashboard')
        }}
      />
    </div>
  )
}
