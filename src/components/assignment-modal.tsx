"use client";

import { AlertIcon, CarIcon, MailIcon } from "@/components/icons";
import { Field, Modal, inputClass } from "@/components/ui";
import { formatDate } from "@/lib/date";
import type { Assignment, Child, Parent, Practice } from "@/lib/types";
import { useMemo, useState } from "react";

export function AssignmentModal({
  practice,
  parents,
  kids,
  assignments,
  rtl,
  busy,
  onClose,
  onSave,
  onRemove,
  onToggleCancelled,
}: {
  practice: Practice | null;
  parents: Parent[];
  kids: Child[];
  assignments: Assignment[];
  rtl: boolean;
  busy: boolean;
  onClose: () => void;
  onSave: (practice: Practice, parentId: string) => void;
  onRemove: (practice: Practice) => void;
  onToggleCancelled: (practice: Practice) => void;
}) {
  const assignment = assignments.find((item) => item.practiceId === practice?.id);
  const [parentId, setParentId] = useState(assignment?.parentId ?? "");

  const counts = useMemo(() => {
    const result = new Map<string, number>();
    assignments.forEach((item) => result.set(item.parentId, (result.get(item.parentId) ?? 0) + 1));
    return result;
  }, [assignments]);

  if (!practice) return null;
  const selectedParent = parents.find((parent) => parent.id === parentId);
  const activeChildren = kids.filter(
    (child) => child.active && practice.childIds.includes(child.id),
  );
  const capacityWarning =
    selectedParent?.capacity !== undefined && activeChildren.length > selectedParent.capacity;

  return (
    <Modal open title="Practice details" onClose={onClose}>
      <div className="grid gap-5">
        <div className={`rounded-2xl p-4 ${practice.cancelledAt ? "bg-[#eee9f5]" : "bg-[#edf4ef]"}`}>
          <p className="text-lg font-black">
            {formatDate(practice.date, undefined, rtl ? "he-IL" : "en-IL")}
          </p>
          <p className="mt-1 text-[#506057]">
            {practice.startTime}–{practice.endTime} · {practice.location}
          </p>
          {practice.notes && <p className="mt-2 text-sm text-[#65736b]">{practice.notes}</p>}
          {practice.cancelledAt && (
            <p className="mt-2 text-sm font-black uppercase tracking-wide text-[#756783]">
              This practice is cancelled
            </p>
          )}
        </div>

        {!practice.cancelledAt && (
          <>
            <div className="flex items-center justify-between rounded-xl border border-[#e1e8e2] px-4 py-3">
              <span className="text-sm text-[#65736b]">Current driver</span>
              <strong>
                {parents.find((parent) => parent.id === assignment?.parentId)?.name ?? "Not assigned"}
              </strong>
            </div>

            <Field label="Assign parent">
              <select
                value={parentId}
                onChange={(event) => setParentId(event.target.value)}
                className={inputClass}
              >
                <option value="">Choose a parent</option>
                {parents
                  .filter((parent) => parent.active)
                  .sort((a, b) => (counts.get(a.id) ?? 0) - (counts.get(b.id) ?? 0))
                  .map((parent) => (
                    <option key={parent.id} value={parent.id}>
                      {parent.name} ({counts.get(parent.id) ?? 0} drives) · capacity{" "}
                      {parent.capacity ?? "—"}
                    </option>
                  ))}
              </select>
            </Field>
          </>
        )}

        {activeChildren.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-semibold">Children ({activeChildren.length})</p>
            <div className="flex flex-wrap gap-2">
              {activeChildren.map((child) => (
                <span key={child.id} className="rounded-full bg-[#eef2ee] px-3 py-1 text-xs font-semibold">
                  {child.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {capacityWarning && (
          <div className="flex gap-3 rounded-xl bg-[#fff1d7] p-3 text-sm text-[#85520a]">
            <AlertIcon className="mt-0.5 size-5 shrink-0" />
            <span>
              This practice has {activeChildren.length} children, but {selectedParent?.name}&apos;s
              car capacity is {selectedParent?.capacity}. You can still save the assignment.
            </span>
          </div>
        )}

        {assignment && (
          <div className="flex items-center gap-2 text-xs text-[#65736b]">
            <MailIcon className="size-4" />
            Invitation: {assignment.calendarInviteStatus.replace("_", " ")}
          </div>
        )}

        <div className="grid gap-2 sm:grid-cols-2">
          {!practice.cancelledAt && (
            <>
              <button
                type="button"
                disabled={!parentId || busy}
                onClick={() => onSave(practice, parentId)}
                className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#1f6a46] px-4 font-bold text-white transition hover:bg-[#164d35]"
              >
                <CarIcon className="size-5" />
                {busy ? "Saving…" : "Save assignment"}
              </button>
              <button
                type="button"
                disabled={!assignment || busy}
                onClick={() => onRemove(practice)}
                className="min-h-12 rounded-xl border border-[#e2b7aa] px-4 font-bold text-[#b54f31] transition hover:bg-[#fff0eb]"
              >
                Remove assignment
              </button>
            </>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => onToggleCancelled(practice)}
            className={`min-h-12 rounded-xl px-4 font-bold sm:col-span-2 ${
              practice.cancelledAt
                ? "bg-[#756783] text-white hover:bg-[#655974]"
                : "border border-[#d6cde0] text-[#756783] hover:bg-[#f1edf5]"
            }`}
          >
            {practice.cancelledAt ? "Restore practice" : "Cancel this practice"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
