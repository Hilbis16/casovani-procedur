"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/planovani", label: "Plánování" },
  { href: "/pacienti", label: "Pacienti" },
  { href: "/terapeuti", label: "Terapeuti" },
  { href: "/procedury", label: "Procedury" },
];

export function MainNav() {
  const pathname = usePathname();

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-screen-xl mx-auto px-4 flex items-center gap-8 h-14">
        <span className="font-semibold text-blue-700 text-lg shrink-0">🏥 Lázeňský dům</span>
        <div className="flex gap-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  active
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
