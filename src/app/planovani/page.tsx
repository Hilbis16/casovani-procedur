import { getWeekSchedules } from '@/modules/scheduling/actions/scheduleActions'
import { getPatients } from '@/modules/core/actions/patientActions'
import { getTherapists } from '@/modules/scheduling/actions/therapistActions'
import { getProcedures } from '@/modules/scheduling/actions/procedureActions'
import { PlanningView } from '@/modules/scheduling/components/PlanningView'
import { getWeekDays, parseWeekParam } from '@/modules/core/lib/dateUtils'

export default async function PlanovaniPage({
  searchParams,
}: {
  searchParams: Promise<{ tyden?: string }>
}) {
  const params = await searchParams
  const weekStart = parseWeekParam(params.tyden ?? null)
  const weekDays = getWeekDays(weekStart)

  const [schedules, patients, therapists, procedures] = await Promise.all([
    getWeekSchedules(weekStart),
    getPatients(),
    getTherapists(),
    getProcedures(),
  ])

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Plánování procedur</h1>
      <PlanningView
        weekDays={weekDays}
        weekStart={weekStart}
        schedules={schedules}
        patients={patients}
        therapists={therapists}
        procedures={procedures}
      />
    </div>
  )
}
