import { create } from 'zustand'
import type { Notification } from '@/types'
import { localApi } from '@/lib/localDb'

interface NotificationState {
  notifications: Notification[]
  load: (userId: string) => void
  refreshSession: () => void
  markRead: (id: string) => void
  markAllRead: (userId: string) => void
  unreadCount: () => number
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],

  load: (userId) => {
    set({ notifications: localApi.getNotifications(userId) })
  },

  refreshSession: () => {
    const user = localApi.getSessionUser()
    if (user) set({ notifications: localApi.getNotifications(user.id) })
  },

  markRead: (id) => {
    localApi.markNotificationRead(id)
    set((s) => ({
      notifications: s.notifications.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    }))
  },

  markAllRead: (userId) => {
    localApi.markAllNotificationsRead(userId)
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, is_read: true })),
    }))
  },

  unreadCount: () => get().notifications.filter((n) => !n.is_read).length,
}))
