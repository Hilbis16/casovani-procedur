'use client'

import type { PrescriptionTemplate, PrescriptionTemplateItem, Procedure } from '@prisma/client'

export type TemplateWithItems = PrescriptionTemplate & {
  items: (PrescriptionTemplateItem & { procedure: Procedure })[]
}

interface Props {
  templates: TemplateWithItems[]
  selectedId: string
  onSelect: (template: TemplateWithItems | null) => void
}

export function TemplateSelector({ templates, selectedId, onSelect }: Props) {
  const selected = templates.find((t) => t.id === selectedId)

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">Šablona předpisu</label>
      <select
        value={selectedId}
        onChange={(e) => {
          const id = e.target.value
          onSelect(id ? (templates.find((t) => t.id === id) ?? null) : null)
        }}
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">— Začít prázdné (ručně) —</option>
        {templates.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
      {selected?.description && (
        <p className="text-xs text-gray-500 italic">{selected.description}</p>
      )}
    </div>
  )
}
