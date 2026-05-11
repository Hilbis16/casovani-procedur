import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getTherapist } from '@/modules/scheduling/actions/therapistActions'
import { getTherapistWeekSchedules } from '@/modules/scheduling/actions/scheduleActions'
import { getTherapists } from '@/modules/scheduling/actions/therapistActions'
import { getProcedures } from '@/modules/scheduling/actions/procedureActions'
import { getPatients } from '@/modules/core/actions/patientActions'
import { WeeklyGrid } from '@/modules/scheduling/components/WeeklyGrid'
import { WeekSelector } from '@/modules/scheduling/components/WeekSelector'
import { getWeekDays, parseWeekParam } from '@/modules/core/lib/dateUtils'
import { DAY_NAMES } from '@/lib/constants'

export default async function TerapeutDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tyden?: string }>
}) {
  const { id } = await params
  const { tyden } = await searchParams

  const therapist = await getTherapist(id)
  if (!therapist) notFound()

  const weekStart = parseWeekParam(tyden ?? null)
  const weekDays = getWeekDays(weekStart)

  const [schedules, therapists, procedures, patients] = await Promise.all([
    getTherapistWeekSchedules(therapist.id, weekStart),
    getTherapists(),
    getProcedures(),
    getPatients(),
  ])

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <Link href="/terapeuti" className="text-gray-400 hover:text-gray-600 text-sm">
          ← Zpět
        </Link>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full" style={{ backgroundColor: therapist.color }} />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {therapist.lastName} {therapist.firstName}
            </h1>
            <p className="text-gray-500 text-sm">{therapist.phone ?? 'Bez telefonu'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/terapeuti/${therapist.id}/tisk`}
            className="px-4 py-2 border border-gray-200 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Tisk dne
          </Link>
          <Link
            href={`/terapeuti/${therapist.id}/upravit`}
            className="px-4 py-2 border border-gray-200 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Upravit
          </Link>
        </div>
      </div>

      {therapist.availabilities.length > 0 && (
        <div className="mb-6 bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Dostupnost</h3>
          <div className="flex gap-3 flex-wrap">
            {[1, 2, 3, 4, 5, 6].map((day) => {
              const avail = therapist.availabilities.find((a) => a.dayOfWeek === day)
              return (
                <div
                  key={day}
                  className={`text-xs px-3 py-1.5 rounded-lg ${avail ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-400'}`}
                >
                  <span className="font-medium">{DAY_NAMES[day]}</span>
                  {avail && (
                    <span className="ml-1">
                      {avail.startTime}–{avail.endTime}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Týdenní rozvrh</h2>
        <WeekSelector weekStart={weekStart} baseHref={`/terapeuti/${therapist.id}`} />
      </div>

      <WeeklyGrid
        weekDays={weekDays}
        schedules={schedules}
        patients={patients}
        therapists={therapists}
        procedures={procedures}
        filterTherapistId={therapist.id}
      />
    </div>
  )
}
