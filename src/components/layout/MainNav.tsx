'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'

type NavItem = { href: string; label: string; module?: 'scheduling' | 'hotel' }

const NAV_ITEMS: NavItem[] = [
  { href: '/planovani', label: 'Plánování', module: 'scheduling' },
  { href: '/pacienti', label: 'Pacienti' },
  { href: '/predpisy', label: 'Předpisy', module: 'scheduling' },
  { href: '/terapeuti', label: 'Terapeuti', module: 'scheduling' },
  { href: '/procedury', label: 'Procedury', module: 'scheduling' },
  { href: '/prehled', label: 'Denní přehled' },
  { href: '/statistiky', label: 'Statistiky', module: 'scheduling' },
  { href: '/vykaz', label: 'Výkaz', module: 'scheduling' },
  { href: '/ubytovani', label: 'Ubytování', module: 'hotel' },
  { href: '/spravce/uzivatele', label: 'Správce' },
]

interface Props {
  enabledModules: string[]
}

export function MainNav({ enabledModules }: Props) {
  const pathname = usePathname()
  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.module || enabledModules.includes(item.module)
  )

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm print:hidden">
      <div className="max-w-screen-xl mx-auto px-4 flex items-center gap-8 h-14">
        <span className="font-semibold text-blue-700 text-lg shrink-0">🏥 Lázeňský dům</span>
        <div className="flex gap-1">
          {visibleItems.map((item) => {
            const active = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  active
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </div>
        <div className="ml-auto">
          <button
            onClick={() => signOut({ callbackUrl: '/prihlaseni' })}
            className="px-3 py-1.5 rounded text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          >
            Odhlásit
          </button>
        </div>
      </div>
    </nav>
  )
}
