import { create } from 'zustand'
import type { User } from '@/types'
import { localApi } from '@/lib/localDb'

interface AuthState {
  user: User | null
  loading: boolean
  init: () => void
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, name: string) => Promise<void>
  loginAsDev: () => Promise<void>
  logout: () => void
  refreshUser: () => void
  updateProfile: (patch: Partial<User>) => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,

  init: () => {
    localApi.ensureDevAccount()
    localApi.ensureOpsAccount()
    void import('@/lib/localDb').then(({ migrateBlobsToIndexedDb }) => {
      void migrateBlobsToIndexedDb()
    })
    const user = localApi.getSessionUser()
    set({ user, loading: false })
  },

  login: async (email, password) => {
    const user = localApi.login(email, password)
    set({ user })
  },

  signup: async (email, password, name) => {
    const user = localApi.signup(email, password, name)
    set({ user })
  },

  loginAsDev: async () => {
    const user = localApi.loginAsDev()
    set({ user })
  },

  logout: () => {
    localApi.logout()
    set({ user: null })
  },

  refreshUser: () => {
    set({ user: localApi.getSessionUser() })
  },

  updateProfile: async (patch) => {
    const current = get().user
    if (!current) throw new Error('로그인이 필요합니다')
    const user = localApi.updateUser(current.id, patch)
    set({ user })
  },
}))
