"use client";

import { ChildIcon, EditIcon, TrashIcon } from "@/components/icons";
import { EmptyState, Field, Modal, inputClass } from "@/components/ui";
import { Header } from "@/components/parents-manager";
import type { Child } from "@/lib/types";
import { useState, type FormEvent } from "react";

export function ChildrenManager({
  kids,
  onSave,
  onDelete,
}: {
  kids: Child[];
  onSave: (child: Child) => void;
  onDelete: (child: Child) => void;
}) {
  const [editing, setEditing] = useState<Child | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", family: "", active: true });

  function show(child?: Child) {
    setEditing(child ?? null);
    setForm(child ? { name: child.name, family: child.family, active: child.active } : { name: "", family: "", active: true });
    setOpen(true);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    onSave({
      id: editing?.id ?? crypto.randomUUID(),
      name: form.name.trim(),
      family: form.family.trim(),
      active: form.active,
    });
    setOpen(false);
  }

  return (
    <section>
      <Header title="Children" text="Optional roster used for capacity checks." action="Add child" onAction={() => show()} />
      {kids.length === 0 ? (
        <EmptyState icon={<ChildIcon className="size-6" />} title="No children configured" text="Add children to include a roster in invitations and capacity warnings." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#e0e7e1] bg-white">
          {kids.map((child, index) => (
            <div key={child.id} className={`flex items-center justify-between gap-4 px-4 py-4 sm:px-5 ${index ? "border-t border-[#edf0ed]" : ""}`}>
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#edf4ef] font-black text-[#1f6a46]">{child.name[0]}</span>
                <div>
                  <strong className="block">{child.name}</strong>
                  <span className="text-sm text-[#65736b]">{child.family} family · {child.active ? "Active" : "Inactive"}</span>
                </div>
              </div>
              <div className="flex gap-1">
                <button type="button" onClick={() => show(child)} className="grid size-11 place-items-center rounded-xl hover:bg-[#eef3ef]" aria-label={`Edit ${child.name}`}><EditIcon className="size-4" /></button>
                <button type="button" onClick={() => onDelete(child)} className="grid size-11 place-items-center rounded-xl text-[#b54f31] hover:bg-[#fff0eb]" aria-label={`Delete ${child.name}`}><TrashIcon className="size-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal open={open} title={editing ? "Edit child" : "Add child"} onClose={() => setOpen(false)}>
        <form onSubmit={submit} className="grid gap-4">
          <Field label="Child name"><input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
          <Field label="Family"><input className={inputClass} value={form.family} onChange={(e) => setForm({ ...form, family: e.target.value })} required /></Field>
          <label className="flex min-h-12 items-center gap-3 rounded-xl border border-[#e0e7e1] px-4 font-semibold">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="size-5 accent-[#1f6a46]" /> Active child
          </label>
          <button className="min-h-12 rounded-xl bg-[#1f6a46] px-5 font-bold text-white hover:bg-[#164d35]">Save child</button>
        </form>
      </Modal>
    </section>
  );
}
