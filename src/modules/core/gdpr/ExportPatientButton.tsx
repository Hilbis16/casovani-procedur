'use client'

import { useTransition } from 'react'
import { exportPatientData } from '@/modules/core/gdpr/actions'

export function ExportPatientButton({ patientId }: { patientId: string }) {
  const [isPending, startTransition] = useTransition()

  const handleExport = () => {
    startTransition(async () => {
      const result = await exportPatientData(patientId)
      if (!result.success) {
        alert('Chyba: ' + result.error)
        return
      }
      const bytes = Uint8Array.from(atob(result.pdfBase64), (c) => c.charCodeAt(0))
      const blob = new Blob([bytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = result.fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    })
  }

  return (
    <button
      onClick={handleExport}
      disabled={isPending}
      className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
    >
      {isPending ? 'Generuji PDF...' : 'Exportovat data (GDPR)'}
    </button>
  )
}
