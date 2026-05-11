import { NextRequest, NextResponse } from 'next/server'
import { findFreeSlots } from '@/modules/scheduling/lib/conflictDetection'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const therapistId = searchParams.get('therapistId') ?? ''
  const patientId = searchParams.get('patientId') ?? ''
  const date = searchParams.get('date')
  const durationMin = Number(searchParams.get('durationMin'))
  const procedureId = searchParams.get('procedureId') ?? undefined
  const excludeId = searchParams.get('excludeId') ?? undefined

  if (!therapistId || !patientId || !date || !durationMin) {
    return NextResponse.json({ slots: [] })
  }

  const dateObj = new Date(date)
  dateObj.setUTCHours(0, 0, 0, 0)

  const slots = await findFreeSlots({
    therapistId,
    patientId,
    date: dateObj,
    durationMin,
    procedureId,
    excludeScheduleId: excludeId,
  })

  return NextResponse.json({ slots })
}
