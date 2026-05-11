import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getPatient } from '@/actions/patientActions'
import { PatientForm } from '@/components/patients/PatientForm'

export default async function UpravitPacientaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const patient = await getPatient(id)
  if (!patient) notFound()

  const stay = patient.stays[0]

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/pacienti/${id}`} className="text-gray-400 hover:text-gray-600 text-sm">
          ← Zpět
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Upravit pacienta</h1>
      </div>
      <PatientForm patient={patient} stay={stay ?? null} />
    </div>
  )
}
