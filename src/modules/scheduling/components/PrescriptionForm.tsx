'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { Patient, Stay, Procedure, Therapist } from '@prisma/client'
import {
  previewPrescription,
  createPrescription,
  type ProposalSlot,
  type PrescriptionAdjustment,
} from '@/modules/scheduling/actions/prescriptionActions'
import { TemplateSelector, type TemplateWithItems } from './TemplateSelector'
import { PrescriptionItemsTable, type ItemRow } from './PrescriptionItemsTable'
import { PrescriptionPreview } from './PrescriptionPreview'
import { FreeSlotPopover } from './FreeSlotPopover'
import { formatCzechFull } from '@/modules/core/lib/dateUtils'

interface Props {
  patient: Patient
  stay: Stay
  procedures: Procedure[]
  therapists: Therapist[]
  templates: TemplateWithItems[]
}

function emptyRow(): ItemRow {
  return { procedureId: '', therapistId: '', repetitions: '3', preferredTime: '09:00' }
}

export function PrescriptionForm({ patient, stay, procedures, therapists, templates }: Props) {
  const router = useRouter()
  const [templateId, setTemplateId] = useState('')
  const [items, setItems] = useState<ItemRow[]>([emptyRow()])
  const [notes, setNotes] = useState('')
  const [proposals, setProposals] = useState<ProposalSlot[] | null>(null)
  const [adjustments, setAdjustments] = useState<PrescriptionAdjustment[]>([])
  const [moveSlot, setMoveSlot] = useState<ProposalSlot | null>(null)
  const [error, setError] = useState('')
  const [isPreviewing, startPreview] = useTransition()
  const [isSubmitting, startSubmit] = useTransition()

  const validItems = items.filter(
    (it) => it.procedureId && it.therapistId && Number(it.repetitions) > 0
  )

  function handleTemplateSelect(template: TemplateWithItems | null) {
    setTemplateId(template?.id ?? '')
    setAdjustments([])
    setProposals(null)
    if (template && template.items.length > 0) {
      setItems(
        template.items.map((it) => ({
          procedureId: it.procedureId,
          therapistId: therapists[0]?.id ?? '',
          repetitions: String(it.repetitions),
          preferredTime: it.preferredTime,
        }))
      )
    } else {
      setItems([emptyRow()])
    }
  }

  async function runPreview(
    nextItems: ItemRow[] = validItems,
    nextAdjustments: PrescriptionAdjustment[] = adjustments
  ) {
    setError('')
    startPreview(async () => {
      const res = await previewPrescription({
        stayId: stay.id,
        items: nextItems.map((it) => ({
          procedureId: it.procedureId,
          therapistId: it.therapistId,
          repetitions: Number(it.repetitions),
          preferredTime: it.preferredTime,
        })),
        adjustments: nextAdjustments,
      })
      if (res.error) {
        setError(res.error)
        setProposals(null)
        toast.error(res.error)
      } else {
        setProposals(res.proposals)
        const okCount = res.proposals.filter((p) => p.conflicts.length === 0).length
        const conflictCount = res.proposals.length - okCount
        if (conflictCount > 0) {
          toast.warning(
            `Náhled: ${okCount} OK, ${conflictCount} konflikt${conflictCount === 1 ? '' : 'ů'}`
          )
        }
      }
    })
  }

  function handleSkip(itemIndex: number, occurrence: number) {
    const next = [
      ...adjustments.filter((a) => !(a.itemIndex === itemIndex && a.occurrence === occurrence)),
      { itemIndex, occurrence, action: 'skip' as const },
    ]
    setAdjustments(next)
    runPreview(validItems, next)
  }

  function handleMove(slot: ProposalSlot) {
    setMoveSlot(slot)
  }

  function applyMove(newDate: string, newTime: string, newTherapistId: string) {
    if (!moveSlot) return
    const { itemIndex, occurrence } = moveSlot
    const next = [
      ...adjustments.filter((a) => !(a.itemIndex === itemIndex && a.occurrence === occurrence)),
      {
        itemIndex,
        occurrence,
        action: 'move' as const,
        newDate,
        newTime,
        newTherapistId,
      },
    ]
    setAdjustments(next)
    setMoveSlot(null)
    runPreview(validItems, next)
  }

  function handleSubmit() {
    if (validItems.length === 0) {
      setError('Přidejte alespoň jednu validní položku.')
      return
    }
    setError('')
    startSubmit(async () => {
      const res = await createPrescription({
        stayId: stay.id,
        templateId: templateId || undefined,
        notes: notes || undefined,
        items: validItems.map((it) => ({
          procedureId: it.procedureId,
          therapistId: it.therapistId,
          repetitions: Number(it.repetitions),
          preferredTime: it.preferredTime,
        })),
        adjustments,
      })
      if (res.success && res.prescriptionId) {
        toast.success(
          `Předpis vytvořen — naplánováno ${res.created}${res.skipped > 0 ? `, přeskočeno ${res.skipped}` : ''}`
        )
        router.push(`/predpisy/${res.prescriptionId}`)
      } else {
        const msg = res.error ?? 'Chyba při vytváření předpisu'
        setError(msg)
        toast.error(msg)
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 rounded-lg px-4 py-3 text-sm">
        <div className="font-medium text-blue-900">
          Pacient: {patient.lastName} {patient.firstName}
        </div>
        <div className="text-blue-700">
          Pobyt {stay.code} · {formatCzechFull(new Date(stay.arrivalDate))} –{' '}
          {formatCzechFull(new Date(stay.departureDate))}
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-gray-800">1. Šablona (volitelné)</h2>
        <TemplateSelector
          templates={templates}
          selectedId={templateId}
          onSelect={handleTemplateSelect}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-gray-800">2. Procedury v předpisu</h2>
        <PrescriptionItemsTable
          items={items}
          procedures={procedures}
          therapists={therapists}
          onChange={(next) => {
            setItems(next)
            setProposals(null)
            setAdjustments([])
          }}
        />
      </section>

      <section className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Poznámka (volitelné)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Doplňující informace pro recepční / terapeuty"
        />
      </section>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => runPreview()}
          disabled={isPreviewing || validItems.length === 0}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isPreviewing ? 'Počítám...' : '3. Náhled rozpočtu →'}
        </button>
        {adjustments.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setAdjustments([])
              runPreview(validItems, [])
            }}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Obnovit původní rozvrh
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {proposals && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-gray-800">Náhled rozpočtu</h2>
          <PrescriptionPreview
            proposals={proposals}
            procedures={procedures}
            therapists={therapists}
            onSkip={handleSkip}
            onMove={handleMove}
            adjustments={adjustments}
          />

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-5 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? 'Vytvářím...' : 'Vytvořit předpis ✓'}
            </button>
          </div>
        </section>
      )}

      {moveSlot && (
        <FreeSlotPopover
          stayId={stay.id}
          slot={moveSlot}
          procedures={procedures}
          therapists={therapists}
          onCancel={() => setMoveSlot(null)}
          onConfirm={applyMove}
        />
      )}
    </div>
  )
}
