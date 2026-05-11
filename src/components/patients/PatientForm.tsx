'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createPatient, updatePatient, deletePatient } from '@/modules/core/actions/patientActions'
import type { Patient, Stay } from '@prisma/client'
import { formatDateParam } from '@\/modules\/core\/lib\/dateUtils'

interface Props {
  patient?: Patient
  stay?: Stay | null
}

export function PatientForm({ patient, stay }: Props) {
  const router = useRouter()
  const isEdit = !!patient
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const fd = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = isEdit ? await updatePatient(patient!.id, fd) : await createPatient(fd)
      if (result.success) {
        router.push('/pacienti')
      } else {
        setError(result.error ?? 'Chyba při ukládání')
      }
    })
  }

  async function handleDelete() {
    if (!confirm('Opravdu smazat tohoto pacienta? Budou smazány i všechny jeho procedury.')) return
    startTransition(async () => {
      await deletePatient(patient!.id)
      router.push('/pacienti')
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4 max-w-lg"
    >
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Jméno *</label>
          <input
            name="firstName"
            required
            defaultValue={patient?.firstName}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Příjmení *</label>
          <input
            name="lastName"
            required
            defaultValue={patient?.lastName}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Datum příjezdu {!isEdit && '*'}
          </label>
          <input
            name="arrivalDate"
            type="date"
            required={!isEdit}
            defaultValue={stay ? formatDateParam(new Date(stay.arrivalDate)) : ''}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Datum odjezdu {!isEdit && '*'}
          </label>
          <input
            name="departureDate"
            type="date"
            required={!isEdit}
            defaultValue={stay ? formatDateParam(new Date(stay.departureDate)) : ''}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Poznámka</label>
        <textarea
          name="note"
          rows={2}
          defaultValue={patient?.note ?? ''}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          placeholder="Alergie, omezení, speciální požadavky..."
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-between pt-2">
        {isEdit && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            Smazat pacienta
          </button>
        )}
        <div className="flex gap-3 ml-auto">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            Zrušit
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isPending ? 'Ukládám...' : isEdit ? 'Uložit změny' : 'Přidat pacienta'}
          </button>
        </div>
      </div>
    </form>
  )
}
