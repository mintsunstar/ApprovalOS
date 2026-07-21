import { useMemo } from 'react'
import { localApi } from '@/lib/localDb'

export function AdminLogs() {
  const logs = useMemo(() => localApi.listAdminLogs(200), [])

  return (
    <div>
      <h1 className="text-2xl font-semibold">운영 로그</h1>
      <p className="mt-1 text-sm text-ink-muted">운영자 액션만 기록합니다 (사용자/에러 로그는 Out of scope)</p>

      <div className="mt-6 overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-surface-raised text-ink-muted">
            <tr>
              <th className="px-4 py-3 font-medium">시각</th>
              <th className="px-4 py-3 font-medium">운영자</th>
              <th className="px-4 py-3 font-medium">액션</th>
              <th className="px-4 py-3 font-medium">상세</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-t border-border">
                <td className="whitespace-nowrap px-4 py-2.5 text-ink-muted">
                  {new Date(log.created_at).toLocaleString('ko-KR')}
                </td>
                <td className="px-4 py-2.5">{log.admin?.email ?? log.admin_user_id.slice(0, 8)}</td>
                <td className="px-4 py-2.5 font-mono text-xs">{log.action}</td>
                <td className="px-4 py-2.5">{log.detail}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-ink-muted">
                  로그 없음
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
