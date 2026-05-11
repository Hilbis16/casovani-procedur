import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getTherapist } from '@/modules/scheduling/actions/therapistActions'
import { TherapistForm } from '@/components/therapists/TherapistForm'

export default async function UpravitTerapeutaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const therapist = await getTherapist(id)
  if (!therapist) notFound()

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/terapeuti/${id}`} className="text-gray-400 hover:text-gray-600 text-sm">
          ← Zpět
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Upravit terapeuta</h1>
      </div>
      <TherapistForm therapist={therapist} />
    </div>
  )
}
