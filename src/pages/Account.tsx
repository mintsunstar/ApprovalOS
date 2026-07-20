import { useState } from 'react'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { ConfirmDialog } from '@/components/common/Modal'
import { useAuthStore } from '@/stores/authStore'
import { localApi } from '@/lib/localDb'
import { toast } from '@/stores/toastStore'
import type { NotificationPrefs } from '@/types'
import { DEFAULT_NOTIFICATION_PREFS } from '@/types'

export function Account() {
  const { user, updateProfile, logout } = useAuthStore()
  const [name, setName] = useState(user?.name ?? '')
  const [company, setCompany] = useState(user?.company ?? '')
  const [title, setTitle] = useState(user?.title ?? '')
  const [prefs, setPrefs] = useState<NotificationPrefs>(
    user?.notification_prefs ?? DEFAULT_NOTIFICATION_PREFS
  )
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')

  if (!user) return null

  const saveProfile = async () => {
    if (name.trim().length < 2) {
      toast.error('이름은 2자 이상이어야 합니다')
      return
    }
    await updateProfile({
      name: name.trim(),
      company: company.trim() || null,
      title: title.trim() || null,
    })
    toast.success('프로필이 저장되었습니다')
  }

  const savePrefs = async () => {
    localApi.updateNotificationPrefs(user.id, prefs)
    await updateProfile({ notification_prefs: prefs })
    toast.success('알림 설정이 저장되었습니다')
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="mb-8 text-2xl font-semibold">계정 설정</h1>

      <section className="mb-8 rounded-xl border border-border bg-surface-raised p-5">
        <h2 className="mb-4 font-medium">프로필</h2>
        <div className="mb-4 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-xl text-white">
            {user.name.charAt(0)}
          </div>
        </div>
        <div className="space-y-3">
          <Input label="이름" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="소속" value={company} onChange={(e) => setCompany(e.target.value)} />
          <Input label="직책" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Button onClick={saveProfile}>저장</Button>
        </div>
      </section>

      <section className="mb-8 rounded-xl border border-border bg-surface-raised p-5">
        <h2 className="mb-4 font-medium">알림 설정</h2>
        {(
          [
            ['deadline_soon', '투표 마감 임박'],
            ['new_comment', '새 댓글'],
            ['new_pin', '새 핀 댓글'],
            ['approval_requested', '승인 요청'],
            ['rejected', '반려 발생'],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="mb-3 flex items-center justify-between text-sm">
            <span>{label}</span>
            <input
              type="checkbox"
              checked={prefs[key]}
              onChange={(e) => setPrefs({ ...prefs, [key]: e.target.checked })}
            />
          </label>
        ))}
        <Button size="sm" onClick={savePrefs}>
          알림 설정 저장
        </Button>
      </section>

      <button className="text-sm text-danger hover:underline" onClick={() => setDeleteOpen(true)}>
        계정 탈퇴
      </button>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="정말 탈퇴하시겠습니까?"
        description='탈퇴 시 모든 데이터가 삭제됩니다. "탈퇴"를 입력하여 확인해주세요.'
        confirmLabel="탈퇴하기"
        danger
        onConfirm={() => {
          if (deleteConfirm !== '탈퇴') {
            toast.error('"탈퇴"를 입력해주세요')
            return
          }
          logout()
          toast.success('탈퇴 처리되었습니다 (데모)')
        }}
      />
      {deleteOpen && (
        <div className="fixed bottom-24 left-1/2 z-[60] w-80 -translate-x-1/2">
          <Input
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            placeholder="탈퇴"
          />
        </div>
      )}
    </div>
  )
}
