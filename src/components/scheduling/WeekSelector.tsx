"use client";

import Link from "next/link";
import { addDays } from "date-fns";
import { formatCzechDate, formatDateParam } from "@/lib/dateUtils";

interface Props {
  weekStart: Date;
  baseHref: string;
}

export function WeekSelector({ weekStart, baseHref }: Props) {
  const weekEnd = addDays(weekStart, 5);
  const prevWeek = addDays(weekStart, -7);
  const nextWeek = addDays(weekStart, 7);

  function href(date: Date) {
    return `${baseHref}?tyden=${formatDateParam(date)}`;
  }

  return (
    <div className="flex items-center gap-3">
      <Link
        href={href(prevWeek)}
        className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm hover:bg-gray-50 transition-colors"
      >
        ←
      </Link>
      <span className="text-sm font-medium text-gray-700 min-w-[180px] text-center">
        {formatCzechDate(weekStart)} – {formatCzechDate(weekEnd)} {weekEnd.getFullYear()}
      </span>
      <Link
        href={href(nextWeek)}
        className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm hover:bg-gray-50 transition-colors"
      >
        →
      </Link>
    </div>
  );
}
