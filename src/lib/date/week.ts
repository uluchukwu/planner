import { Weekday } from "@/generated/prisma/enums";

// All dates in this app are represented as naive "YYYY-MM-DD" strings (dateKeys).
// We deliberately avoid `DateTime` day-boundary math so that timezone shifts and DST
// transitions cannot corrupt which calendar day a task, habit completion, or week
// boundary belongs to.

const WEEKDAY_ORDER: Weekday[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
  SATURDAY: "Saturday",
  SUNDAY: "Sunday",
};

export function todayKey(): string {
  return dateToKey(new Date());
}

export function dateToKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function keyToDate(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// JS Date#getDay(): 0=Sunday..6=Saturday. Map onto our Weekday enum order (Mon-first).
function jsDayToWeekday(jsDay: number): Weekday {
  return WEEKDAY_ORDER[(jsDay + 6) % 7];
}

export function weekdayOf(key: string): Weekday {
  return jsDayToWeekday(keyToDate(key).getDay());
}

export function addDays(key: string, days: number): string {
  const date = keyToDate(key);
  date.setDate(date.getDate() + days);
  return dateToKey(date);
}

// Returns the dateKey of the first day of the week containing `key`, given the user's
// configured week-start day. This is the single source of truth for week boundaries;
// nowhere else should hardcode "Monday".
export function getWeekStart(key: string, weekStartsOn: Weekday): string {
  const current = WEEKDAY_ORDER.indexOf(weekdayOf(key));
  const start = WEEKDAY_ORDER.indexOf(weekStartsOn);
  const diff = (current - start + 7) % 7;
  return addDays(key, -diff);
}

export function getWeekEnd(key: string, weekStartsOn: Weekday): string {
  return addDays(getWeekStart(key, weekStartsOn), 6);
}

// The 7 dateKeys of the week containing `key`, in weekStartsOn order.
export function getWeekDays(key: string, weekStartsOn: Weekday): string[] {
  const start = getWeekStart(key, weekStartsOn);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

// Ordered weekday labels starting from the user's weekStartsOn setting, for headers.
export function orderedWeekdays(weekStartsOn: Weekday): Weekday[] {
  const start = WEEKDAY_ORDER.indexOf(weekStartsOn);
  return Array.from({ length: 7 }, (_, i) => WEEKDAY_ORDER[(start + i) % 7]);
}

export function formatDateLong(key: string): string {
  return keyToDate(key).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function formatMonthDay(key: string): string {
  return keyToDate(key).toLocaleDateString(undefined, { day: "numeric", month: "long" });
}

export function formatDateShort(key: string): string {
  return keyToDate(key).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

// All dateKeys from the 1st of the month containing `key` through `key` itself,
// inclusive — used for "days elapsed this month" style stats.
export function daysElapsedInMonth(key: string): string[] {
  const [y, m] = key.split("-").map(Number);
  const monthStart = `${y}-${String(m).padStart(2, "0")}-01`;
  const days: string[] = [];
  let cursor = monthStart;
  while (cursor <= key) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return days;
}

export function shiftMonthKey(monthKey: string, delta: number): string {
  const [y, m] = monthKey.split("-").map(Number);
  const date = new Date(y, m - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function formatMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export function formatWeekRange(startKey: string, endKey: string): string {
  const start = keyToDate(startKey);
  const end = keyToDate(endKey);
  const sameMonth = start.getMonth() === end.getMonth();
  const startStr = start.toLocaleDateString(undefined, { day: "numeric", month: sameMonth ? undefined : "short" });
  const endStr = end.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  return `${startStr} – ${endStr}`;
}

// Countdown label for a goal's target date. `today` is a parameter rather than an
// internal todayKey() call so this stays pure and testable (same pattern as
// habits.ts's computeCurrentStreak). Math.round rather than floor/trunc: both dates
// are local midnight, so the difference is normally an exact multiple of a day, but
// a DST transition between them can make it 23 or 25 hours — round absorbs that back
// to a whole day instead of silently producing an off-by-one.
export function formatCountdown(targetDate: string, today: string): string {
  const days = Math.round((keyToDate(targetDate).getTime() - keyToDate(today).getTime()) / 86_400_000);
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  if (days === -1) return "1 day overdue";
  if (days > 1) return `in ${days} days`;
  return `${-days} days overdue`;
}
