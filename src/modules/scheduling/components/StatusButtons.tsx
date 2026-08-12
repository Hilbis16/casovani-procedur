'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { updateScheduleStatus } from '@/modules/scheduling/actions/scheduleActions'

interface Props {
  scheduleId: string
  currentStatus: string
  billedAt?: Date | string | null
}

const STATUS_LABELS: Record<string, string> = {
  completed: 'Absolvováno',
  no_show: 'Pacient se nedostavil',
}

export function StatusButtons({ scheduleId, currentStatus, billedAt }: Props) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  if (billedAt) {
    return (
      <span className="text-xs text-gray-400 select-none" title="Vykázáno pojišťovně">
        🔒
      </span>
    )
  }

  if (['completed', 'cancelled', 'no_show'].includes(currentStatus)) return null

  function handleStatus(status: string) {
    startTransition(async () => {
      const res = await updateScheduleStatus(scheduleId, status)
      if (res.success) {
        toast.success(STATUS_LABELS[status] ?? 'Stav změněn')
        router.refresh()
      } else {
        toast.error('error' in res ? res.error : 'Chyba při změně stavu')
      }
    })
  }

  return (
    <div className="flex gap-1 print:hidden">
      <button
        disabled={isPending}
        onClick={() => handleStatus('completed')}
        className="px-2 py-0.5 text-xs rounded bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-50 transition-colors"
        title="Absolvováno"
      >
        ✓
      </button>
      <button
        disabled={isPending}
        onClick={() => handleStatus('no_show')}
        className="px-2 py-0.5 text-xs rounded bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50 transition-colors"
        title="Nedostavil se"
      >
        ✗
      </button>
    </div>
  )
}
