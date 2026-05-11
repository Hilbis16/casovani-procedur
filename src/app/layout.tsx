import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { MainNav } from '@/components/layout/MainNav'

const inter = Inter({ subsets: ['latin', 'latin-ext'] })

export const metadata: Metadata = {
  title: 'Lázeňské procedury',
  description: 'Plánování procedur pro lázeňské zařízení',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const raw = process.env.ENABLED_MODULES ?? 'scheduling,hotel'
  const enabledModules = raw.split(',').map((m) => m.trim())

  return (
    <html lang="cs" className="h-full">
      <body className={`${inter.className} h-full bg-gray-50 text-gray-900`}>
        <MainNav enabledModules={enabledModules} />
        <main className="max-w-screen-xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  )
}
