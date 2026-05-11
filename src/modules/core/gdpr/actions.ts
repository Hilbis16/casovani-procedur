'use server'

import React from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import { getPatientFullData } from '@/modules/core/gdpr/sar'
import { PatientDataPDF } from '@/modules/reporting/pdf/PatientDataPDF'

export async function exportPatientData(
  patientId: string
): Promise<
  { success: true; pdfBase64: string; fileName: string } | { success: false; error: string }
> {
  try {
    const data = await getPatientFullData(patientId)
    // renderToBuffer expects ReactElement<DocumentProps>; createElement infers a wider type so cast is required
    const buffer = await renderToBuffer(React.createElement(PatientDataPDF, { data }) as any)
    const pdfBase64 = buffer.toString('base64')
    const date = new Date().toISOString().split('T')[0]
    return {
      success: true,
      pdfBase64,
      fileName: `gdpr-export-${data.patient.lastName}-${date}.pdf`,
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Chyba při generování PDF',
    }
  }
}
