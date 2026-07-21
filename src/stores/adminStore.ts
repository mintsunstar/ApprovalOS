import { create } from 'zustand'
import type { AdminUser } from '@/types'
import { localApi } from '@/lib/localDb'

interface AdminState {
  admin: AdminUser | null
  loading: boolean
  init: () => void
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refresh: () => void
}

export const useAdminStore = create<AdminState>((set) => ({
  admin: null,
  loading: true,

  init: () => {
    localApi.ensureOpsAccount()
    set({ admin: localApi.getAdminSession(), loading: false })
  },

  login: async (email, password) => {
    const admin = localApi.adminLogin(email, password)
    set({ admin })
  },

  logout: () => {
    localApi.adminLogout()
    set({ admin: null })
  },

  refresh: () => {
    set({ admin: localApi.getAdminSession() })
  },
}))
