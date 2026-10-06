"use client";

import { EditIcon, PlusIcon, TrashIcon, UsersIcon } from "@/components/icons";
import { EmptyState, Field, Modal, inputClass } from "@/components/ui";
import type { Parent } from "@/lib/types";
import { useState, type FormEvent } from "react";

const emptyParent = {
  name: "",
  email: "",
  phone: "",
  capacity: "",
  active: true,
};

export function ParentsManager({
  parents,
  currentParentId,
  assignedParentIds,
  onSave,
  onDelete,
}: {
  parents: Parent[];
  currentParentId: string;
  assignedParentIds: Set<string>;
  onSave: (parent: Parent) => void;
  onDelete: (parent: Parent) => void;
}) {
  const [editing, setEditing] = useState<Parent | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyParent);

  function show(parent?: Parent) {
    setEditing(parent ?? null);
    setForm(
      parent
        ? {
            name: parent.name,
            email: parent.email,
            phone: parent.phone ?? "",
            capacity: parent.capacity?.toString() ?? "",
            active: parent.active,
          }
        : emptyParent,
    );
    setOpen(true);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    onSave({
      id: editing?.id ?? crypto.randomUUID(),
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim() || undefined,
      capacity: form.capacity ? Number(form.capacity) : undefined,
      active: editing?.id === currentParentId ? true : form.active,
      createdAt: editing?.createdAt ?? new Date().toISOString(),
    });
    setOpen(false);
  }

  return (
    <section>
      <Header
        title="Parents"
        text="Manage who can sign in and drive."
        action="Add parent"
        onAction={() => show()}
      />
      {parents.length === 0 ? (
        <EmptyState
          icon={<UsersIcon className="size-6" />}
          title="No parents yet"
          text="Add the first parent to start assigning practice drives."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {parents.map((parent) => (
            <article key={parent.id} className="rounded-2xl border border-[#e0e7e1] bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[#e1efe5] text-lg font-black text-[#1f6a46]">
                    {parent.name.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-black">{parent.name}</h3>
                    <p className="truncate text-sm text-[#65736b]">{parent.email}</p>
                  </div>
                </div>
                <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${
                  parent.active ? "bg-[#dff0e2] text-[#236440]" : "bg-[#ecefed] text-[#6f7b73]"
                }`}>
                  {parent.active ? "Active" : "Inactive"}
                </span>
              </div>
              <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-[#78857d]">Phone</dt>
                  <dd className="font-semibold">{parent.phone || "—"}</dd>
                </div>
                <div>
                  <dt className="text-[#78857d]">Car capacity</dt>
                  <dd className="font-semibold">{parent.capacity ?? "—"} children</dd>
                </div>
              </dl>
              <div className="mt-5 flex gap-2">
                <button type="button" onClick={() => show(parent)} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#eef3ef] font-bold transition hover:bg-[#e2eae4]">
                  <EditIcon className="size-4" /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(parent)}
                  disabled={parent.id === currentParentId || assignedParentIds.has(parent.id)}
                  title={
                    parent.id === currentParentId
                      ? "Your signed-in parent account cannot be deleted."
                      : assignedParentIds.has(parent.id)
                        ? "Deactivate parents with assignment history instead of deleting them."
                        : "Delete parent"
                  }
                  className="grid size-11 place-items-center rounded-xl bg-[#fff0eb] text-[#b54f31] transition hover:bg-[#ffe3da]"
                >
                  <TrashIcon className="size-4" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      <Modal open={open} title={editing ? "Edit parent" : "Add parent"} onClose={() => setOpen(false)}>
        <form onSubmit={submit} className="grid gap-4">
          <Field label="Parent name">
            <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </Field>
          <Field label="Email address">
            <input type="email" className={inputClass} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Phone (optional)">
              <input type="tel" className={inputClass} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label="Car capacity">
              <input type="number" min="1" max="20" className={inputClass} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
            </Field>
          </div>
          <label className="flex min-h-12 items-center gap-3 rounded-xl border border-[#e0e7e1] px-4 font-semibold">
            <input
              type="checkbox"
              checked={editing?.id === currentParentId || form.active}
              disabled={editing?.id === currentParentId}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              className="size-5 accent-[#1f6a46]"
            />
            {editing?.id === currentParentId ? "Active parent (current account)" : "Active parent"}
          </label>
          <button className="min-h-12 rounded-xl bg-[#1f6a46] px-5 font-bold text-white hover:bg-[#164d35]">Save parent</button>
        </form>
      </Modal>
    </section>
  );
}

export function Header({ title, text, action, onAction }: { title: string; text: string; action: string; onAction: () => void }) {
  return (
    <header className="mb-5 flex items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-black tracking-tight">{title}</h1>
        <p className="mt-1 text-[#65736b]">{text}</p>
      </div>
      <button type="button" onClick={onAction} aria-label={action} className="flex min-h-12 shrink-0 items-center gap-2 rounded-xl bg-[#1f6a46] px-4 font-bold text-white transition hover:bg-[#164d35]">
        <PlusIcon className="size-5" />
        <span className="hidden sm:inline">{action}</span>
      </button>
    </header>
  );
}
