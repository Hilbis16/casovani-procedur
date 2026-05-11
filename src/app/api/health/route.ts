import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({ db: 'ok', status: 'ok' })
  } catch {
    return NextResponse.json({ db: 'error', status: 'degraded' }, { status: 503 })
  }
}
