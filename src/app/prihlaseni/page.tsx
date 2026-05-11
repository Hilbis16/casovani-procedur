import { LoginForm } from './LoginForm'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'

export default async function PrihlaseniPage() {
  const session = await auth()
  if (session) redirect('/planovani')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-lg px-8 py-10">
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">Přihlášení</h1>
          <p className="text-sm text-gray-500 mb-8">Lázeňské procedury</p>
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
