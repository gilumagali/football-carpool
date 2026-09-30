"use client";

import { ChevronLeft, ChevronRight } from "@/components/icons";
import {
  addMonths,
  calendarDays,
  formatDate,
  formatMonth,
  isPast,
  isToday,
  startOfMonth,
  toDateKey,
} from "@/lib/date";
import type { Assignment, Parent, Practice } from "@/lib/types";

interface MonthCalendarProps {
  month: Date;
  practices: Practice[];
  parents: Parent[];
  assignments: Assignment[];
  rtl: boolean;
  onMonthChange: (date: Date) => void;
  onPracticeClick: (practice: Practice) => void;
}

export function MonthCalendar({
  month,
  practices,
  parents,
  assignments,
  rtl,
  onMonthChange,
  onPracticeClick,
}: MonthCalendarProps) {
  const locale = rtl ? "he-IL" : "en-IL";
  const weekdays = rtl
    ? ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"]
    : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const byDate = new Map<string, Practice[]>();
  practices.forEach((practice) => {
    byDate.set(practice.date, [...(byDate.get(practice.date) ?? []), practice]);
  });

  const monthPrefix = toDateKey(month).slice(0, 7);
  const mobilePractices = practices
    .filter((practice) => practice.date.startsWith(monthPrefix))
    .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`));

  return (
    <>
      <section className="overflow-hidden rounded-[24px] border border-[#e0e7e1] bg-white shadow-[0_12px_35px_rgba(42,72,53,.07)] sm:hidden">
        <MonthHeader
          month={month}
          rtl={rtl}
          locale={locale}
          onMonthChange={onMonthChange}
        />
        <div className="grid gap-2 p-3">
          {mobilePractices.length === 0 ? (
            <div className="rounded-2xl bg-[#f4f6f3] px-5 py-9 text-center">
              <p className="font-black">No practices this month</p>
              <p className="mt-1 text-sm text-[#65736b]">
                Add a Monday or Wednesday practice to get started.
              </p>
            </div>
          ) : (
            mobilePractices.map((practice) => {
              const assignment = assignments.find(
                (item) => item.practiceId === practice.id,
              );
              const parent = parents.find((item) => item.id === assignment?.parentId);
              const past = isPast(practice.date);
              const cancelled = Boolean(practice.cancelledAt);
              return (
                <button
                  type="button"
                  key={practice.id}
                  onClick={() => onPracticeClick(practice)}
                  className="flex min-h-20 items-center gap-3 rounded-2xl border border-[#e7ece8] bg-white p-3 text-start shadow-sm transition active:scale-[.99]"
                >
                  <span
                    className={`grid size-14 shrink-0 place-items-center rounded-2xl ${
                      cancelled
                        ? "bg-[#eee9f5] text-[#756783]"
                        : past
                          ? "bg-[#e9ecea] text-[#6f7a73]"
                          : parent
                            ? "bg-[#d9f0df] text-[#155b38]"
                            : "bg-[#ffe3d8] text-[#a34227]"
                    }`}
                  >
                    <span className="text-[10px] font-black uppercase leading-none">
                      {formatDate(practice.date, { weekday: "short" }, locale)}
                    </span>
                    <strong className="text-xl leading-none">
                      {Number(practice.date.slice(-2))}
                    </strong>
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="block">
                      {practice.startTime}–{practice.endTime}
                    </strong>
                    <span className="block truncate text-sm text-[#65736b]">
                      {practice.location}
                    </span>
                    <span
                      className={`mt-1 block text-xs font-bold ${
                        cancelled
                          ? "text-[#756783]"
                          : parent
                            ? "text-[#1f6a46]"
                            : "text-[#b54f31]"
                      }`}
                    >
                      {cancelled
                        ? rtl
                          ? "מבוטל"
                          : "Cancelled"
                        : parent?.name ?? (rtl ? "דרוש נהג" : "Needs a driver")}
                    </span>
                  </span>
                  <ChevronRight
                    className={`size-5 shrink-0 text-[#89958d] ${rtl ? "rotate-180" : ""}`}
                  />
                </button>
              );
            })
          )}
        </div>
      </section>

      <section className="hidden overflow-hidden rounded-[24px] border border-[#e0e7e1] bg-white shadow-[0_12px_35px_rgba(42,72,53,.07)] sm:block">
        <MonthHeader
          month={month}
          rtl={rtl}
          locale={locale}
          onMonthChange={onMonthChange}
        />

        <div className="grid grid-cols-7 border-b border-[#e8ede9] bg-[#f7f9f6]">
          {weekdays.map((day) => (
            <div
              key={day}
              className="px-1 py-2 text-center text-[11px] font-bold uppercase tracking-wide text-[#718078] sm:text-xs"
            >
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
                    const assignment = assignments.find(
                      (item) => item.practiceId === practice.id,
                    );
                    const parent = parents.find(
                      (item) => item.id === assignment?.parentId,
                    );
                    const past = isPast(practice.date);
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
                              : parent
                                ? "bg-[#d9f0df] text-[#155b38]"
                                : "bg-[#ffe3d8] text-[#a34227]"
                        }`}
                      >
                        <span className="calendar-event-time">
                          {practice.startTime} ·{" "}
                        </span>
                        <span className="block truncate sm:inline">
                          {cancelled
                            ? rtl
                              ? "מבוטל"
                              : "Cancelled"
                            : parent?.name ?? (rtl ? "ללא נהג" : "No driver")}
                        </span>
                      </button>
                    );
                  })}
                  {dayPractices.length > 2 && (
                    <span className="px-1 text-[9px] font-bold text-[#718078]">
                      +{dayPractices.length - 2}
                    </span>
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
    </>
  );
}

function MonthHeader({
  month,
  rtl,
  locale,
  onMonthChange,
}: {
  month: Date;
  rtl: boolean;
  locale: string;
  onMonthChange: (date: Date) => void;
}) {
  return (
    <header className="flex items-center justify-between gap-2 border-b border-[#e8ede9] px-2 py-2 sm:px-5 sm:py-3">
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => onMonthChange(addMonths(month, -1))}
          className="grid size-11 place-items-center rounded-xl transition hover:bg-[#eef3ef]"
          aria-label="Previous month"
        >
          {rtl ? (
            <ChevronRight className="size-5" />
          ) : (
            <ChevronLeft className="size-5" />
          )}
        </button>
        <button
          type="button"
          onClick={() => onMonthChange(startOfMonth(new Date()))}
          className="h-11 rounded-xl px-2 text-xs font-bold transition hover:bg-[#eef3ef] sm:px-3 sm:text-sm"
        >
          Today
        </button>
        <button
          type="button"
          onClick={() => onMonthChange(addMonths(month, 1))}
          className="grid size-11 place-items-center rounded-xl transition hover:bg-[#eef3ef]"
          aria-label="Next month"
        >
          {rtl ? (
            <ChevronLeft className="size-5" />
          ) : (
            <ChevronRight className="size-5" />
          )}
        </button>
      </div>
      <h2 className="text-base font-black capitalize sm:text-2xl">
        {formatMonth(month, locale)}
      </h2>
    </header>
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
