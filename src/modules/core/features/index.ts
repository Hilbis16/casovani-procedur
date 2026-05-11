export type Module = 'scheduling' | 'hotel'

const raw = process.env.ENABLED_MODULES ?? 'scheduling,hotel'
const enabled = new Set(raw.split(',').map((m) => m.trim()) as Module[])

export function isModuleEnabled(mod: Module): boolean {
  return enabled.has(mod)
}

export const ENABLED_MODULES = enabled
