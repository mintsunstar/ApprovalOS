import { useState } from 'react'
import { localApi } from '@/lib/localDb'
import { useAdminStore } from '@/stores/adminStore'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { toast } from '@/stores/toastStore'
import type { PlanLimitsMap, PlanType } from '@/types'
import { DEFAULT_PLAN_LIMITS } from '@/types'

const PLANS: PlanType[] = ['free', 'pro', 'enterprise']

export function AdminPlans() {
  const admin = useAdminStore((s) => s.admin)!
  const [limits, setLimits] = useState<PlanLimitsMap>(() => structuredClone(localApi.getPlanLimits()))

  const setField = (plan: PlanType, key: keyof PlanLimitsMap['free'], value: number) => {
    setLimits((prev) => ({
      ...prev,
      [plan]: { ...prev[plan], [key]: value },
    }))
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">플랜 한도</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Free 프로젝트 5·멤버 5 (현행 앱 기준). 저장 시 일반 앱 한도 표시에 반영됩니다.
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {PLANS.map((plan) => (
          <div key={plan} className="rounded-xl border border-border bg-surface-raised p-5">
            <h2 className="text-lg font-semibold uppercase">{plan}</h2>
            <div className="mt-4 space-y-3">
              <Input
                label="최대 멤버"
                type="number"
                value={limits[plan].max_members}
                onChange={(e) => setField(plan, 'max_members', Number(e.target.value) || 0)}
              />
              <Input
                label="최대 프로젝트"
                type="number"
                value={limits[plan].max_projects}
                onChange={(e) => setField(plan, 'max_projects', Number(e.target.value) || 0)}
              />
              <Input
                label="스토리지 (GB)"
                type="number"
                value={limits[plan].storage_gb}
                onChange={(e) => setField(plan, 'storage_gb', Number(e.target.value) || 0)}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex gap-2">
        <Button
          onClick={() => {
            localApi.updatePlanLimits(limits, admin.id)
            toast.success('플랜 한도 저장됨')
          }}
        >
          저장
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            setLimits(structuredClone(DEFAULT_PLAN_LIMITS))
            toast.info('기본값으로 되돌림 (저장 필요)')
          }}
        >
          기본값
        </Button>
      </div>
    </div>
  )
}
