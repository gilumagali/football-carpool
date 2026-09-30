"use client";

import { AlertIcon, CarIcon } from "@/components/icons";
import { EmptyState } from "@/components/ui";
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
    <div className="grid gap-4 lg:grid-cols-[1.3fr_.7fr]">
      <section className="rounded-[22px] border border-[#e0e7e1] bg-white p-5 shadow-[0_10px_30px_rgba(42,72,53,.05)]">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.14em] text-[#b55437]">Action needed</p>
            <h2 className="text-xl font-black">Upcoming unassigned</h2>
          </div>
          <span className="grid size-10 place-items-center rounded-full bg-[#fff0ea] text-[#c25535]">
            <AlertIcon className="size-5" />
          </span>
        </div>
        {upcomingUnassigned.length === 0 ? (
          <EmptyState
            icon={<CarIcon className="size-6" />}
            title="Every ride is covered"
            text="There are no upcoming practices waiting for a driver."
          />
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

      <section className="rounded-[22px] bg-[#174f37] p-5 text-white shadow-[0_10px_30px_rgba(23,79,55,.16)]">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.14em] text-[#dff36b]">Fair share</p>
            <h2 className="text-xl font-black">Driving summary</h2>
          </div>
          <CarIcon className="size-7 text-[#dff36b]" />
        </div>
        <div className="grid gap-2">
          {parents.filter((parent) => parent.active).map((parent) => {
            const count = counts.get(parent.id) ?? 0;
            return (
              <div key={parent.id} className="flex items-center justify-between rounded-xl bg-white/8 px-3 py-2.5">
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
