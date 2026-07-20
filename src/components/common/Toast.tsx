import { useToastStore } from '@/stores/toastStore'
import type { ToastType } from '@/stores/toastStore'

const styles: Record<ToastType, string> = {
  success: 'bg-accent text-white',
  error: 'bg-danger text-white',
  warning: 'bg-warning text-white',
  info: 'bg-info text-white',
}

export function ToastContainer() {
  const { toasts, remove } = useToastStore()
  return (
    <div className="fixed inset-x-4 bottom-4 z-[100] flex flex-col gap-2 sm:inset-x-auto sm:right-4 sm:bottom-4 pb-[env(safe-area-inset-bottom,0px)]">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex min-w-0 items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm shadow-lg sm:min-w-[260px] ${styles[t.type]}`}
        >
          <span>{t.message}</span>
          <button onClick={() => remove(t.id)} className="opacity-80 hover:opacity-100">
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
