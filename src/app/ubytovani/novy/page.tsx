import { getPatients } from '@/modules/scheduling/actions/patientActions'
import { getRooms } from '@/modules/hotel/actions/stayActions'
import { NovyPobytForm } from './NovyPobytForm'

export default async function NovyPobytPage() {
  const [patients, rooms] = await Promise.all([getPatients(), getRooms()])
  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Nový pobyt</h1>
      <NovyPobytForm patients={patients} rooms={rooms} />
    </div>
  )
}
