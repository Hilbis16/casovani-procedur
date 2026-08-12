'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { cancelPrescription } from '@/modules/scheduling/actions/prescriptionActions'

interface Props {
  prescriptionId: string
}

export function CancelPrescriptionButton({ prescriptionId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleCancel() {
    if (
      !confirm(
        'Opravdu chcete předpis zrušit? Všechny nedokončené procedury budou označené jako zrušené.'
      )
    ) {
      return
    }
    startTransition(async () => {
      const res = await cancelPrescription(prescriptionId)
      if (res.success) {
        toast.success(
          `Předpis zrušen${res.cancelledSchedules > 0 ? ` (zrušeno ${res.cancelledSchedules} procedur)` : ''}`
        )
        router.push('/predpisy')
      } else {
        toast.error(res.error ?? 'Chyba při rušení předpisu')
      }
    })
  }

  return (
    <button
      type="button"
      onClick={handleCancel}
      disabled={isPending}
      className="px-4 py-2 border border-red-300 text-red-700 text-sm font-medium rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
    >
      {isPending ? 'Ruším...' : 'Zrušit předpis'}
    </button>
  )
}
