"use client";

import { AlertIcon, CarIcon } from "@/components/icons";
import { formatDate, isPast } from "@/lib/date";
import type { Assignment, Parent, Practice } from "@/lib/types";

export function Dashboard({
  parents,
  practices,
  assignments,
  onPracticeClick,
}: {
  parents: Parent[];
  practices: Practice[];
  assignments: Assignment[];
  onPracticeClick: (practice: Practice) => void;
}) {
  const upcomingUnassigned = practices
    .filter(
      (practice) =>
        !practice.cancelledAt &&
        !isPast(practice.date) &&
        !assignments.some((assignment) => assignment.practiceId === practice.id),
    )
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);
  const counts = new Map<string, number>();
  assignments.forEach((assignment) =>
    counts.set(assignment.parentId, (counts.get(assignment.parentId) ?? 0) + 1),
  );
  const activeCounts = parents.filter((parent) => parent.active).map((parent) => counts.get(parent.id) ?? 0);
  const minimum = activeCounts.length ? Math.min(...activeCounts) : 0;

  return (
    <div className="grid gap-3 lg:grid-cols-[1.3fr_.7fr] lg:gap-4">
      <section className="rounded-[22px] border border-[#e0e7e1] bg-white p-4 shadow-[0_10px_30px_rgba(42,72,53,.05)] sm:p-5">
        <div className="mb-3 flex items-center justify-between sm:mb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.14em] text-[#b55437]">Action needed</p>
            <h2 className="text-lg font-black sm:text-xl">Upcoming unassigned</h2>
          </div>
          <span className="grid size-10 place-items-center rounded-full bg-[#fff0ea] text-[#c25535]">
            <AlertIcon className="size-5" />
          </span>
        </div>
        {upcomingUnassigned.length === 0 ? (
          <div className="flex min-h-14 items-center gap-3 rounded-xl bg-[#f1f5f1] px-4">
            <CarIcon className="size-5 text-[#1f6a46]" />
            <span>
              <strong className="block text-sm">Every ride is covered</strong>
              <span className="hidden text-xs text-[#65736b] sm:block">
                There are no upcoming practices waiting for a driver.
              </span>
            </span>
          </div>
        ) : (
          <div className="grid gap-2">
            {upcomingUnassigned.map((practice) => (
              <button
                type="button"
                key={practice.id}
                onClick={() => onPracticeClick(practice)}
                className="flex min-h-14 items-center justify-between gap-3 rounded-xl bg-[#fff7f3] px-4 text-start transition hover:bg-[#ffede5]"
              >
                <span>
                  <strong className="block text-sm">{formatDate(practice.date)}</strong>
                  <span className="text-xs text-[#7b6b64]">{practice.startTime} · {practice.location}</span>
                </span>
                <span className="shrink-0 text-xs font-bold text-[#b54f31]">Assign →</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-[22px] bg-[#174f37] p-4 text-white shadow-[0_10px_30px_rgba(23,79,55,.16)] sm:p-5">
        <div className="mb-3 flex items-center justify-between sm:mb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.14em] text-[#dff36b]">Fair share</p>
            <h2 className="text-lg font-black sm:text-xl">Driving summary</h2>
          </div>
          <CarIcon className="size-7 text-[#dff36b]" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 lg:grid">
          {parents.filter((parent) => parent.active).map((parent) => {
            const count = counts.get(parent.id) ?? 0;
            return (
              <div key={parent.id} className="flex min-w-32 items-center justify-between gap-3 rounded-xl bg-white/8 px-3 py-2.5 lg:min-w-0">
                <span className="font-semibold">{parent.name}</span>
                <span className="flex items-center gap-2">
                  {count === minimum && (
                    <span className="rounded-full bg-[#dff36b] px-2 py-0.5 text-[10px] font-black uppercase text-[#174f37]">
                      Fewest
                    </span>
                  )}
                  <strong>{count}</strong>
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
