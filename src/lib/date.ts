export const TIME_ZONE = "Asia/Jerusalem";

export function toDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

export function fromDateKey(value: string): Date {
  return new Date(`${value}T12:00:00+03:00`);
}

export function formatDate(
  value: string,
  options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    day: "numeric",
    month: "long",
  },
  locale = "en-IL",
): string {
  return new Intl.DateTimeFormat(locale, {
    ...options,
    timeZone: TIME_ZONE,
  }).format(fromDateKey(value));
}

export function formatMonth(date: Date, locale = "en-IL"): string {
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: TIME_ZONE,
  }).format(date);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1, 12);
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 12);
}

export function calendarDays(date: Date): Date[] {
  const first = startOfMonth(date);
  const gridStart = addDays(first, -first.getDay());
  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
}

export function isPast(dateKey: string): boolean {
  return dateKey < toDateKey(new Date());
}

export function isToday(dateKey: string): boolean {
  return dateKey === toDateKey(new Date());
}

export function enumerateRecurrence(
  startDate: string,
  endDate: string,
  weekdays: number[],
): string[] {
  const result: string[] = [];
  for (
    let cursor = fromDateKey(startDate);
    cursor <= fromDateKey(endDate);
    cursor = addDays(cursor, 1)
  ) {
    if (weekdays.includes(cursor.getDay())) {
      result.push(toDateKey(cursor));
    }
  }
  return result;
}

export function dateTimeForInvite(date: string, time: string): string {
  return `${date}T${time}:00`;
}
