'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import {
  markAllAsBilled,
  submitBillingPeriod,
  lockBillingPeriod,
  exportBillingCsv,
} from '@/modules/scheduling/actions/billingActions'

interface Props {
  year: number
  month: number
  periodStatus: string | null
  billableCount: number
}

const PERIOD_LABELS: Record<string, string> = {
  open: 'Otevřeno',
  submitted: 'Odesláno',
  locked: 'Zamčeno',
}

const PERIOD_COLORS: Record<string, string> = {
  open: 'bg-blue-50 text-blue-700 border-blue-200',
  submitted: 'bg-amber-50 text-amber-700 border-amber-200',
  locked: 'bg-green-50 text-green-700 border-green-200',
}

export function BillingActions({ year, month, periodStatus, billableCount }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleMarkAll() {
    startTransition(async () => {
      const res = await markAllAsBilled(year, month)
      if (res.success) {
        toast.success(`Vykázáno ${res.count} procedur`)
      } else {
        toast.error('error' in res ? res.error : 'Chyba při vykazování')
      }
    })
  }

  function handleSubmit() {
    if (!confirm('Odeslat výkaz pojišťovně? Stav změníte na "Odesláno".')) return
    startTransition(async () => {
      const res = await submitBillingPeriod(year, month)
      if (res.success) {
        toast.success('Výkaz odeslán')
      } else {
        toast.error('error' in res ? res.error : 'Chyba při odesílání')
      }
    })
  }

  function handleLock() {
    if (!confirm('Zamknout výkazové období? Tato akce je nevratná.')) return
    startTransition(async () => {
      const res = await lockBillingPeriod(year, month)
      if (res.success) {
        toast.success('Výkazové období zamčeno')
      } else {
        toast.error('error' in res ? res.error : 'Chyba při zamykání')
      }
    })
  }

  function handleExportCsv() {
    startTransition(async () => {
      const res = await exportBillingCsv(year, month)
      if (!res.success) {
        toast.error('error' in res ? res.error : 'Chyba při exportu')
        return
      }
      const bom = '﻿'
      const blob = new Blob([bom + res.csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = res.fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success(`Soubor ${res.fileName} stažen`)
    })
  }

  const status = periodStatus ?? 'open'
  const colorClass = PERIOD_COLORS[status] ?? PERIOD_COLORS.open

  return (
    <div className="flex flex-wrap items-center gap-3">
      {periodStatus && (
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${colorClass}`}>
          {PERIOD_LABELS[status] ?? status}
        </span>
      )}

      {status !== 'locked' && billableCount > 0 && (
        <button
          onClick={handleMarkAll}
          disabled={isPending}
          className="px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Ukládám...' : `Vykázat vše (${billableCount})`}
        </button>
      )}

      {status === 'open' && billableCount === 0 && periodStatus === 'open' && (
        <button
          onClick={handleSubmit}
          disabled={isPending}
          className="px-3 py-1.5 text-sm font-medium bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 transition-colors"
        >
          {isPending ? '...' : 'Odeslat výkaz'}
        </button>
      )}

      {status === 'submitted' && (
        <>
          <button
            onClick={handleLock}
            disabled={isPending}
            className="px-3 py-1.5 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {isPending ? '...' : 'Zamknout'}
          </button>
        </>
      )}

      {periodStatus && (
        <button
          onClick={handleExportCsv}
          disabled={isPending}
          className="px-3 py-1.5 text-sm font-medium border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          Export CSV
        </button>
      )}
    </div>
  )
}
