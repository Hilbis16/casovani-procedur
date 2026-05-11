import { getRoles } from '@/actions/adminActions'

export default async function RolePage() {
  const roles = await getRoles()

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Role a oprávnění</h1>
      <p className="text-sm text-gray-500 mb-6">Role jsou pevně dané systémem a nelze je měnit.</p>
      <div className="grid gap-4">
        {roles.map((role) => (
          <div key={role.id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-medium">{role.name}</span>
              <span className="text-xs text-gray-400 font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                {role.key}
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {role.permissions.map((p) => (
                <span
                  key={p.id}
                  className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-mono"
                >
                  {p.action}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
