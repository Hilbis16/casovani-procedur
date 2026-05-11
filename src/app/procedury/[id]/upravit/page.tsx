'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { updateProcedure, getAllProcedures } from '@/modules/scheduling/actions/procedureActions'
import { CATEGORIES } from '@/lib/constants'

export default function UpravitProceduraPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [durationMin, setDurationMin] = useState('30')
  const [capacity, setCapacity] = useState('1')
  const [description, setDescription] = useState('')
  const [building, setBuilding] = useState('')
  const [room, setRoom] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    getAllProcedures().then((list) => {
      const p = list.find((x) => x.id === id)
      if (p) {
        setName(p.name)
        setCategory(p.category)
        setDurationMin(String(p.durationMin))
        setCapacity(String(p.capacity ?? 1))
        setDescription(p.description ?? '')
        setBuilding(p.building ?? '')
        setRoom(p.room ?? '')
      }
      setLoading(false)
    })
  }, [id])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await updateProcedure(id, fd)
      if (result.success) {
        router.push('/procedury')
      } else {
        setError(result.error ?? 'Chyba při ukládání')
      }
    })
  }

  if (loading) {
    return <div className="text-gray-400 text-sm p-6">Načítám...</div>
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/procedury" className="text-gray-400 hover:text-gray-600 text-sm">
          ← Zpět
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Upravit proceduru</h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4 max-w-lg"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Název *</label>
          <input
            name="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Kategorie *</label>
          <select
            name="category"
            required
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">— vyberte kategorii —</option>
            {Object.entries(CATEGORIES).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Délka trvání (minuty) *
            </label>
            <input
              name="durationMin"
              type="number"
              required
              min={5}
              step={5}
              value={durationMin}
              onChange={(e) => setDurationMin(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max pacientů najednou *
            </label>
            <input
              name="capacity"
              type="number"
              required
              min={1}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Budova</label>
            <input
              name="building"
              value={building}
              onChange={(e) => setBuilding(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="např. Budova A"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Místnost / kabina
            </label>
            <input
              name="room"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="např. Kabina 3"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Popis</label>
          <textarea
            name="description"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
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
            {isPending ? 'Ukládám...' : 'Uložit změny'}
          </button>
        </div>
      </form>
    </div>
  )
}
