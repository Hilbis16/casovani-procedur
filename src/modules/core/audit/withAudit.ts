import { writeAuditLog, type AuditParams } from './auditLogger'

type ActionResult = { success: boolean; error?: string; id?: number }

export function withAudit<TArgs extends unknown[]>(
  action: string,
  entity: string,
  fn: (...args: TArgs) => Promise<ActionResult>,
  getEntityId?: (...args: TArgs) => string | number | undefined
) {
  return async (...args: TArgs): Promise<ActionResult> => {
    try {
      const result = await fn(...args)
      await writeAuditLog({
        action,
        entity,
        entityId: getEntityId ? getEntityId(...args) : result.id,
        after: result.success ? { ok: true } : undefined,
        meta: result.success ? undefined : { error: result.error },
      } satisfies AuditParams)
      return result
    } catch (err) {
      await writeAuditLog({
        action,
        entity,
        entityId: getEntityId ? getEntityId(...args) : undefined,
        meta: { error: err instanceof Error ? err.message : String(err) },
      })
      throw err
    }
  }
}
