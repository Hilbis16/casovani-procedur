import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { getUserPermissions } from '@/modules/core/rbac'

export default async function SpravceLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/prihlaseni')

  const perms = await getUserPermissions(session.user.id)
  const hasAccess =
    perms.includes('*') || perms.includes('user.read') || perms.includes('audit.read')
  if (!hasAccess) redirect('/')

  return (
    <div>
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 text-sm text-gray-500">
        <span className="font-medium text-gray-700">Správa systému</span>
        <span className="mx-2">·</span>
        <a href="/spravce/uzivatele" className="hover:text-blue-600">
          Uživatelé
        </a>
        <span className="mx-2">·</span>
        <a href="/spravce/role" className="hover:text-blue-600">
          Role
        </a>
        <span className="mx-2">·</span>
        <a href="/spravce/audit" className="hover:text-blue-600">
          Audit log
        </a>
      </div>
      <div className="max-w-screen-xl mx-auto px-4 py-6">{children}</div>
    </div>
  )
}
