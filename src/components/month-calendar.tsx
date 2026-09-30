"use client";

import { ChevronLeft, ChevronRight } from "@/components/icons";
import {
  addMonths,
  calendarDays,
  formatMonth,
  isPast,
  isToday,
  startOfMonth,
  toDateKey,
} from "@/lib/date";
import type { Assignment, Parent, Practice } from "@/lib/types";

export function MonthCalendar({
  month,
  practices,
  parents,
  assignments,
  rtl,
  onMonthChange,
  onPracticeClick,
}: {
  month: Date;
  practices: Practice[];
  parents: Parent[];
  assignments: Assignment[];
  rtl: boolean;
  onMonthChange: (date: Date) => void;
  onPracticeClick: (practice: Practice) => void;
}) {
  const locale = rtl ? "he-IL" : "en-IL";
  const weekdays = rtl
    ? ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"]
    : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const byDate = new Map<string, Practice[]>();
  practices.forEach((practice) => {
    byDate.set(practice.date, [...(byDate.get(practice.date) ?? []), practice]);
  });

  return (
    <section className="overflow-hidden rounded-[24px] border border-[#e0e7e1] bg-white shadow-[0_12px_35px_rgba(42,72,53,.07)]">
      <header className="flex items-center justify-between gap-3 border-b border-[#e8ede9] px-3 py-3 sm:px-5">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onMonthChange(addMonths(month, -1))}
            className="grid size-11 place-items-center rounded-xl transition hover:bg-[#eef3ef]"
            aria-label="Previous month"
          >
            {rtl ? <ChevronRight className="size-5" /> : <ChevronLeft className="size-5" />}
          </button>
          <button
            type="button"
            onClick={() => onMonthChange(startOfMonth(new Date()))}
            className="h-11 rounded-xl px-3 text-sm font-bold transition hover:bg-[#eef3ef]"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => onMonthChange(addMonths(month, 1))}
            className="grid size-11 place-items-center rounded-xl transition hover:bg-[#eef3ef]"
            aria-label="Next month"
          >
            {rtl ? <ChevronLeft className="size-5" /> : <ChevronRight className="size-5" />}
          </button>
        </div>
        <h2 className="text-lg font-black capitalize sm:text-2xl">{formatMonth(month, locale)}</h2>
      </header>

      <div className="grid grid-cols-7 border-b border-[#e8ede9] bg-[#f7f9f6]">
        {weekdays.map((day) => (
          <div key={day} className="px-1 py-2 text-center text-[11px] font-bold uppercase tracking-wide text-[#718078] sm:text-xs">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {calendarDays(month).map((day) => {
          const dateKey = toDateKey(day);
          const dayPractices = byDate.get(dateKey) ?? [];
          const outsideMonth = day.getMonth() !== month.getMonth();
          return (
            <div
              key={dateKey}
              className={`min-h-20 border-b border-e border-[#edf0ed] p-1 sm:min-h-29 sm:p-1.5 ${
                outsideMonth ? "bg-[#fafbf9] text-[#a7b0aa]" : "bg-white"
              }`}
            >
              <div
                className={`mb-1 grid size-6 place-items-center rounded-full text-xs font-bold sm:size-7 sm:text-sm ${
                  isToday(dateKey) ? "bg-[#1f6a46] text-white" : ""
                }`}
              >
                {day.getDate()}
              </div>
              <div className="grid gap-1">
                {dayPractices.slice(0, 2).map((practice) => {
                  const assignment = assignments.find((item) => item.practiceId === practice.id);
                  const parent = parents.find((item) => item.id === assignment?.parentId);
                  const past = isPast(practice.date);
                  const assigned = Boolean(parent);
                  const cancelled = Boolean(practice.cancelledAt);
                  return (
                    <button
                      type="button"
                      key={practice.id}
                      onClick={() => onPracticeClick(practice)}
                      className={`min-h-8 overflow-hidden rounded-md px-1.5 py-1 text-start text-[9px] font-bold leading-tight transition hover:brightness-95 sm:text-[11px] ${
                        cancelled
                          ? "bg-[#eee9f5] text-[#756783] line-through"
                          : past
                          ? "bg-[#e4e8e5] text-[#6f7a73]"
                          : assigned
                            ? "bg-[#d9f0df] text-[#155b38]"
                            : "bg-[#ffe3d8] text-[#a34227]"
                      }`}
                    >
                      <span className="calendar-event-time">{practice.startTime} · </span>
                      <span className="block truncate sm:inline">
                        {cancelled
                          ? rtl ? "מבוטל" : "Cancelled"
                          : parent?.name ?? (rtl ? "ללא נהג" : "No driver")}
                      </span>
                    </button>
                  );
                })}
                {dayPractices.length > 2 && (
                  <span className="px-1 text-[9px] font-bold text-[#718078]">+{dayPractices.length - 2}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <footer className="flex flex-wrap gap-x-5 gap-y-2 border-t border-[#e8ede9] px-4 py-3 text-xs font-semibold text-[#627068]">
        <Legend color="bg-[#7fc58f]" label="Driver assigned" />
        <Legend color="bg-[#ee926f]" label="Needs a driver" />
        <Legend color="bg-[#aeb8b1]" label="Past practice" />
        <Legend color="bg-[#ad9bbb]" label="Cancelled" />
      </footer>
    </section>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className={`size-2.5 rounded-full ${color}`} />
      {label}
    </span>
  );
}
