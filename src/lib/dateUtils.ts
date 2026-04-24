import { addDays, startOfWeek, format, parseISO } from "date-fns";
import { cs } from "date-fns/locale";

export function getWeekStart(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}

export function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 6 }, (_, i) => addDays(weekStart, i));
}

export function formatCzechDate(date: Date): string {
  return format(date, "d. M.", { locale: cs });
}

export function formatCzechFull(date: Date): string {
  return format(date, "d. M. yyyy", { locale: cs });
}

export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function addMinutes(hhmm: string, minutes: number): string {
  return minutesToTime(timeToMinutes(hhmm) + minutes);
}

export function dateToMidnightUTC(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export function isoToMidnightUTC(iso: string): Date {
  const d = parseISO(iso);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export function formatDateParam(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function parseWeekParam(param: string | null): Date {
  if (!param) return getWeekStart(new Date());
  try {
    return getWeekStart(parseISO(param));
  } catch {
    return getWeekStart(new Date());
  }
}

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}
