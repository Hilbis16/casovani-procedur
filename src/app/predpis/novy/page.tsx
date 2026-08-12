import Link from 'next/link'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

import { getTherapists } from '@/modules/scheduling/actions/therapistActions'
import { getProcedures } from '@/modules/scheduling/actions/procedureActions'
import { getPrescriptionTemplates } from '@/modules/scheduling/actions/prescriptionActions'
import { checkPermission } from '@/modules/core/rbac'
import { PrescriptionForm } from '@/modules/scheduling/components/PrescriptionForm'
import { prisma } from '@/modules/core/db/prisma'

export default async function NovyPredpisPage({
  searchParams,
}: {
  searchParams: Promise<{ stayId?: string; pacientId?: string }>
}) {
  const deny = await checkPermission('prescription.write')
  if (deny) redirect('/')

  const { stayId, pacientId } = await searchParams

  const stay = stayId
    ? await prisma.stay.findFirst({
        where: { id: stayId, deletedAt: null },
        include: { patient: true },
      })
    : pacientId
      ? await prisma.stay.findFirst({
          where: { patientId: pacientId, deletedAt: null },
          orderBy: { arrivalDate: 'desc' },
          include: { patient: true },
        })
      : null

  if (!stay) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Link href="/pacienti" className="text-gray-400 hover:text-gray-600 text-sm">
            ← Zpět na pacienty
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mt-4">Nový předpis</h1>
        <p className="text-gray-500 mt-3">
          Pro vytvoření předpisu vyberte pacienta s aktivním pobytem ze seznamu.
        </p>
      </div>
    )
  }

  const [therapists, procedures, templates] = await Promise.all([
    getTherapists(),
    getProcedures(),
    getPrescriptionTemplates(),
  ])

  const activeProcedures = procedures.filter((p) => p.isActive)
  const activeTherapists = therapists.filter((t) => t.isActive)

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <Link
          href={`/pacienti/${stay.patient.id}`}
          className="text-gray-400 hover:text-gray-600 text-sm"
        >
          ← Zpět na pacienta
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mt-2 mb-6">Nový předpis</h1>

      <PrescriptionForm
        patient={stay.patient}
        stay={stay}
        procedures={activeProcedures}
        therapists={activeTherapists}
        templates={templates}
      />
    </div>
  )
}
