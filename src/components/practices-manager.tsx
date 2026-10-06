"use client";

import { BallIcon, EditIcon, TrashIcon } from "@/components/icons";
import { EmptyState, Field, Modal, inputClass } from "@/components/ui";
import { Header } from "@/components/parents-manager";
import { enumerateRecurrence, formatDate, toDateKey } from "@/lib/date";
import type { Child, Practice } from "@/lib/types";
import { useState, type FormEvent } from "react";

type PracticeForm = {
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  notes: string;
  childIds: string[];
  recurring: boolean;
  endDate: string;
  weekdays: number[];
};

function blankForm(): PracticeForm {
  return {
    date: toDateKey(new Date()),
    startTime: "17:00",
    endTime: "19:00",
    location: "Community Football Field",
    notes: "",
    childIds: [],
    recurring: false,
    endDate: toDateKey(new Date(new Date().setMonth(new Date().getMonth() + 2))),
    weekdays: [1, 3],
  };
}

export function PracticesManager({
  practices,
  kids,
  onSave,
  onDelete,
  onToggleCancelled,
}: {
  practices: Practice[];
  kids: Child[];
  onSave: (practices: Practice[], editingId?: string) => void;
  onDelete: (practice: Practice) => void | Promise<void>;
  onToggleCancelled: (practice: Practice) => void;
}) {
  const [editing, setEditing] = useState<Practice | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<PracticeForm>(blankForm);

  function show(practice?: Practice) {
    setEditing(practice ?? null);
    setForm(
      practice
        ? {
            date: practice.date,
            startTime: practice.startTime,
            endTime: practice.endTime,
            location: practice.location,
            notes: practice.notes,
            childIds: practice.childIds,
            recurring: false,
            endDate: practice.date,
            weekdays: [new Date(`${practice.date}T12:00:00`).getDay()],
          }
        : { ...blankForm(), childIds: kids.filter((child) => child.active).map((child) => child.id) },
    );
    setOpen(true);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const now = new Date().toISOString();
    const dates = form.recurring
      ? enumerateRecurrence(form.date, form.endDate, form.weekdays)
      : [form.date];
    const groupId = form.recurring ? crypto.randomUUID() : undefined;
    const records = dates.map((date) => ({
      id: editing?.id ?? crypto.randomUUID(),
      date,
      startTime: form.startTime,
      endTime: form.endTime,
      location: form.location.trim(),
      notes: form.notes.trim(),
      childIds: form.childIds,
      recurrenceGroupId: groupId ?? editing?.recurrenceGroupId,
      cancelledAt: editing?.cancelledAt,
      createdAt: editing?.createdAt ?? now,
    }));
    onSave(records, editing?.id);
    setOpen(false);
  }

  const sorted = [...practices].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <section>
      <Header title="Practices" text="Create one-off or recurring football sessions." action="Add practice" onAction={() => show()} />
      {sorted.length === 0 ? (
        <EmptyState icon={<BallIcon className="size-6" />} title="No practices yet" text="Create a practice, then assign a driver from the calendar." />
      ) : (
        <div className="grid gap-3">
          {sorted.map((practice) => (
            <article key={practice.id} className="flex items-center justify-between gap-4 rounded-2xl border border-[#e0e7e1] bg-white p-4 sm:p-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-black">{formatDate(practice.date)}</h3>
                  {practice.recurrenceGroupId && <span className="rounded-full bg-[#e7f1e9] px-2 py-0.5 text-[10px] font-black uppercase text-[#2b6a47]">Recurring</span>}
                  {practice.cancelledAt && <span className="rounded-full bg-[#eee9f5] px-2 py-0.5 text-[10px] font-black uppercase text-[#756783]">Cancelled</span>}
                </div>
                <p className="mt-1 truncate text-sm text-[#65736b]">{practice.startTime}–{practice.endTime} · {practice.location}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button type="button" onClick={() => onToggleCancelled(practice)} className="h-11 rounded-xl px-3 text-xs font-black text-[#756783] hover:bg-[#f1edf5]">
                  {practice.cancelledAt ? "Restore" : "Cancel"}
                </button>
                <button type="button" onClick={() => show(practice)} className="grid size-11 place-items-center rounded-xl hover:bg-[#eef3ef]" aria-label="Edit practice"><EditIcon className="size-4" /></button>
                <button type="button" onClick={() => void onDelete(practice)} className="grid size-11 place-items-center rounded-xl text-[#b54f31] hover:bg-[#fff0eb]" aria-label="Delete practice"><TrashIcon className="size-4" /></button>
              </div>
            </article>
          ))}
        </div>
      )}
      <Modal open={open} title={editing ? "Edit practice" : "Add practice"} onClose={() => setOpen(false)} wide>
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={form.recurring ? "Start date" : "Date"}><input type="date" className={inputClass} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required /></Field>
            <Field label="Start time"><input type="time" className={inputClass} value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} required /></Field>
            <Field label="End time"><input type="time" className={inputClass} value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} required /></Field>
          </div>
          <Field label="Location"><input className={inputClass} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} required /></Field>
          <Field label="Notes"><textarea className={`${inputClass} min-h-24 py-3`} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          {!editing && (
            <div className="rounded-2xl border border-[#e0e7e1] p-4">
              <label className="flex items-center gap-3 font-bold">
                <input type="checkbox" checked={form.recurring} onChange={(e) => setForm({ ...form, recurring: e.target.checked })} className="size-5 accent-[#1f6a46]" />
                Recurring practice
              </label>
              {form.recurring && (
                <div className="mt-4 grid gap-4">
                  <Field label="Repeat on">
                    <div className="flex flex-wrap gap-2">
                      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, index) => (
                        <button
                          type="button"
                          key={day}
                          onClick={() => setForm({ ...form, weekdays: form.weekdays.includes(index) ? form.weekdays.filter((item) => item !== index) : [...form.weekdays, index] })}
                          className={`grid size-11 place-items-center rounded-full text-xs font-black ${form.weekdays.includes(index) ? "bg-[#1f6a46] text-white" : "bg-[#eef2ee] text-[#536259]"}`}
                        >
                          {day.slice(0, 2)}
                        </button>
                      ))}
                    </div>
                  </Field>
                  <Field label="End date"><input type="date" min={form.date} className={inputClass} value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required /></Field>
                </div>
              )}
            </div>
          )}
          <Field label="Participating children" hint="Used in invitations and capacity warnings.">
            <div className="grid gap-2 sm:grid-cols-2">
              {kids.filter((child) => child.active).map((child) => (
                <label key={child.id} className="flex min-h-11 items-center gap-3 rounded-xl bg-[#f1f4f1] px-3 font-medium">
                  <input type="checkbox" checked={form.childIds.includes(child.id)} onChange={(e) => setForm({ ...form, childIds: e.target.checked ? [...form.childIds, child.id] : form.childIds.filter((id) => id !== child.id) })} className="size-4 accent-[#1f6a46]" />
                  {child.name} {child.family}
                </label>
              ))}
            </div>
          </Field>
          <button disabled={form.recurring && form.weekdays.length === 0} className="min-h-12 rounded-xl bg-[#1f6a46] px-5 font-bold text-white hover:bg-[#164d35]">
            {form.recurring ? "Create recurring practices" : "Save practice"}
          </button>
        </form>
      </Modal>
    </section>
  );
}
