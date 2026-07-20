import { create } from 'zustand'
import type { Project, DesignItem } from '@/types'
import { localApi } from '@/lib/localDb'

interface ProjectState {
  projects: Project[]
  currentProject: Project | null
  items: DesignItem[]
  loading: boolean
  loadProjects: (workspaceId: string) => void
  loadProject: (id: string) => void
  setCurrentProject: (p: Project | null) => void
  refreshItems: (projectId: string) => void
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  currentProject: null,
  items: [],
  loading: false,

  loadProjects: (workspaceId) => {
    set({ loading: true })
    const projects = localApi.getProjects(workspaceId)
    set({ projects, loading: false })
  },

  loadProject: (id) => {
    set({ loading: true })
    const project = localApi.getProject(id)
    const items = project ? localApi.getItems(id) : []
    set({ currentProject: project, items, loading: false })
  },

  setCurrentProject: (p) => set({ currentProject: p }),

  refreshItems: (projectId) => {
    set({ items: localApi.getItems(projectId) })
  },
}))
