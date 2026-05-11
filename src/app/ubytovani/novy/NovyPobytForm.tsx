'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createStay } from '@/modules/hotel/actions/stayActions'
import type { Patient, Room, Building } from '@prisma/client'

type RoomWithBuilding = Room & { building: Building }

interface Props {
  patients: Patient[]
  rooms: RoomWithBuilding[]
}

export function NovyPobytForm({ patients, rooms }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const [patientId, setPatientId] = useState('')
  const [roomId, setRoomId] = useState('')
  const [arrivalDate, setArrivalDate] = useState('')
  const [departureDate, setDepartureDate] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (new Date(arrivalDate) >= new Date(departureDate)) {
      setError('Datum příjezdu musí být před datem odjezdu.')
      return
    }

    startTransition(async () => {
      const result = await createStay({
        patientId,
        roomId: roomId || undefined,
        arrivalDate: new Date(arrivalDate),
        departureDate: new Date(departureDate),
      })

      if (!result.success) {
        setError(result.error)
        return
      }
      router.push('/ubytovani')
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5"
    >
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Pacient *</label>
        <select
          required
          value={patientId}
          onChange={(e) => setPatientId(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">— vyberte pacienta —</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.lastName} {p.firstName}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Příjezd *</label>
          <input
            required
            type="date"
            value={arrivalDate}
            onChange={(e) => setArrivalDate(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Odjezd *</label>
          <input
            required
            type="date"
            value={departureDate}
            onChange={(e) => setDepartureDate(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Pokoj</label>
        <select
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">— bez přiřazení —</option>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.building.code} · č. {r.number}
              {r.floor != null ? ` (${r.floor}. patro)` : ''}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-between pt-2">
        <button
          type="button"
          onClick={() => router.push('/ubytovani')}
          className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          Zrušit
        </button>
        <button
          type="submit"
          disabled={isPending || !patientId || !arrivalDate || !departureDate}
          className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? 'Ukládám...' : 'Vytvořit pobyt →'}
        </button>
      </div>
    </form>
  )
}
