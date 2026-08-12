'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  createTherapist,
  updateTherapist,
  deleteTherapist,
} from '@/modules/scheduling/actions/therapistActions'
import type { Therapist } from '@prisma/client'

const COLORS = [
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#06B6D4',
  '#F97316',
  '#84CC16',
  '#EC4899',
  '#6366F1',
]

interface Props {
  therapist?: Therapist
}

export function TherapistForm({ therapist }: Props) {
  const router = useRouter()
  const isEdit = !!therapist
  const [color, setColor] = useState(therapist?.color ?? COLORS[0])
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const fd = new FormData(e.currentTarget)
    fd.set('color', color)

    startTransition(async () => {
      const result = isEdit ? await updateTherapist(therapist!.id, fd) : await createTherapist(fd)
      if (result.success) {
        toast.success(isEdit ? 'Terapeut upraven' : 'Terapeut přidán')
        router.push('/terapeuti')
      } else {
        const msg = result.error ?? 'Chyba při ukládání'
        setError(msg)
        toast.error(msg)
      }
    })
  }

  async function handleDelete() {
    if (!confirm('Opravdu smazat tohoto terapeuta?')) return
    startTransition(async () => {
      const res = await deleteTherapist(therapist!.id)
      if (res.success) {
        toast.success('Terapeut smazán')
        router.push('/terapeuti')
      } else {
        toast.error('error' in res ? res.error : 'Chyba při mazání')
      }
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
            defaultValue={therapist?.firstName}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Příjmení *</label>
          <input
            name="lastName"
            required
            defaultValue={therapist?.lastName}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
        <input
          name="phone"
          defaultValue={therapist?.phone ?? ''}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="např. 602 123 456"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Barva v kalendáři</label>
        <div className="flex gap-2 flex-wrap">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110"
              style={{
                backgroundColor: c,
                borderColor: color === c ? '#1f2937' : 'transparent',
              }}
            />
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-sm text-gray-500">{color}</span>
        </div>
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
            Smazat terapeuta
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
            {isPending ? 'Ukládám...' : isEdit ? 'Uložit změny' : 'Přidat terapeuta'}
          </button>
        </div>
      </div>
    </form>
  )
}
