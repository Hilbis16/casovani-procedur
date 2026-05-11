'use client'

import { useState, useTransition } from 'react'
import { createAdminUser, toggleUserActive } from '@/actions/adminActions'

type User = {
  id: string
  email: string
  fullName: string
  isActive: boolean
  createdAt: Date
  roles: { role: { key: string; name: string } }[]
}

type Role = { id: string; key: string; name: string }

export function UserManagement({ users, roles }: { users: User[]; roles: Role[] }) {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleCreate(formData: FormData) {
    setError(null)
    setSuccess(false)
    startTransition(async () => {
      const result = await createAdminUser(formData)
      if (result && !result.success) setError(result.error ?? 'Chyba')
      else setSuccess(true)
    })
  }

  function handleToggle(id: string) {
    startTransition(async () => {
      await toggleUserActive(id)
    })
  }

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold">Správa uživatelů</h1>

      {/* User table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="px-3 py-2 font-medium">Jméno</th>
              <th className="px-3 py-2 font-medium">Email</th>
              <th className="px-3 py-2 font-medium">Role</th>
              <th className="px-3 py-2 font-medium">Stav</th>
              <th className="px-3 py-2 font-medium">Akce</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-3 py-2">{user.fullName}</td>
                <td className="px-3 py-2 text-gray-600">{user.email}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {user.roles.map((ur) => (
                      <span
                        key={ur.role.key}
                        className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-mono"
                      >
                        {ur.role.key}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-medium ${
                      user.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {user.isActive ? 'Aktivní' : 'Neaktivní'}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => handleToggle(user.id)}
                    disabled={pending}
                    className="text-xs text-gray-500 hover:text-gray-900 underline disabled:opacity-50"
                  >
                    {user.isActive ? 'Deaktivovat' : 'Aktivovat'}
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-gray-400">
                  Žádní uživatelé
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create user form */}
      <div className="border border-gray-200 rounded-lg p-6 max-w-md">
        <h2 className="font-medium mb-4">Přidat uživatele</h2>
        {success && (
          <p className="text-sm text-green-700 bg-green-50 rounded p-2 mb-4">Uživatel vytvořen.</p>
        )}
        {error && <p className="text-sm text-red-700 bg-red-50 rounded p-2 mb-4">{error}</p>}
        <form action={handleCreate} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              name="email"
              type="email"
              required
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Jméno a příjmení</label>
            <input
              name="fullName"
              type="text"
              required
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Heslo</label>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Role</label>
            <select
              name="roleId"
              required
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
            >
              <option value="">Vyberte roli…</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.key})
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={pending}
            className="w-full bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {pending ? 'Ukládám…' : 'Vytvořit uživatele'}
          </button>
        </form>
      </div>
    </div>
  )
}
