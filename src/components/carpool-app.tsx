"use client";

import { AssignmentModal } from "@/components/assignment-modal";
import { ChildrenManager } from "@/components/children-manager";
import { Dashboard } from "@/components/dashboard";
import { BallIcon, CalendarIcon, ChildIcon, PlusIcon, UsersIcon } from "@/components/icons";
import { Login } from "@/components/login";
import { MonthCalendar } from "@/components/month-calendar";
import { ParentsManager } from "@/components/parents-manager";
import { PracticesManager } from "@/components/practices-manager";
import { startOfMonth } from "@/lib/date";
import { downloadCalendarInvitation } from "@/lib/calendar-invitation";
import { loadData, loadRtl, loadSession, saveData, saveRtl, saveSession } from "@/lib/store";
import type { AppTab, CarpoolData, Child, Parent, Practice } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";

const tabs: { id: AppTab; label: string; icon: typeof CalendarIcon }[] = [
  { id: "calendar", label: "Calendar", icon: CalendarIcon },
  { id: "practices", label: "Practices", icon: BallIcon },
  { id: "parents", label: "Parents", icon: UsersIcon },
  { id: "children", label: "Children", icon: ChildIcon },
];

export function CarpoolApp() {
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<CarpoolData | null>(null);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [tab, setTab] = useState<AppTab>("calendar");
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selectedPractice, setSelectedPractice] = useState<Practice | null>(null);
  const [rtl, setRtl] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    queueMicrotask(() => {
      setData(loadData());
      setSessionEmail(loadSession());
      setRtl(loadRtl());
      setReady(true);
    });
  }, []);

  function updateData(updater: (current: CarpoolData) => CarpoolData) {
    setData((current) => {
      if (!current) return current;
      const next = updater(current);
      saveData(next);
      return next;
    });
  }

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 3500);
  }

  const currentParent = useMemo(
    () => data?.parents.find((parent) => parent.email === sessionEmail),
    [data?.parents, sessionEmail],
  );

  if (!ready || !data) {
    return <div className="grid min-h-screen place-items-center font-bold text-[#1f6a46]">Loading carpool…</div>;
  }

  if (!currentParent) {
    return (
      <Login
        parents={data.parents}
        onLogin={(email) => {
          const parent = data.parents.find((item) => item.active && item.email.toLowerCase() === email);
          if (!parent) return false;
          setSessionEmail(parent.email);
          saveSession(parent.email);
          return true;
        }}
      />
    );
  }

  const appData = data;

  async function sendInvitation(
    action: "send" | "cancel",
    practice: Practice,
    parent: Parent,
    eventId: string,
  ) {
    downloadCalendarInvitation({
      action,
      eventId,
      parent,
      practice,
      children: appData.children.filter((child) => practice.childIds.includes(child.id)),
    });
    return action === "cancel" ? "cancelled" : "generated";
  }

  async function assignParent(practice: Practice, parentId: string) {
    const parent = appData.parents.find((item) => item.id === parentId);
    if (!parent) return;
    const previous = appData.assignments.find((item) => item.practiceId === practice.id);
    const previousParent = appData.parents.find((item) => item.id === previous?.parentId);
    if (previous?.parentId === parentId) {
      setSelectedPractice(null);
      return;
    }
    setBusy(true);
    const now = new Date().toISOString();
    const eventId = previous?.calendarEventId ?? `football-carpool-${practice.id}@football-carpool`;
    try {
      if (previous && previousParent) {
        await sendInvitation("cancel", practice, previousParent, eventId);
      }
      updateData((current) => ({
        ...current,
        assignments: [
          ...current.assignments.filter((item) => item.practiceId !== practice.id),
          {
            id: previous?.id ?? crypto.randomUUID(),
            practiceId: practice.id,
            parentId,
            calendarEventId: eventId,
            calendarInviteStatus: "sending",
            createdAt: previous?.createdAt ?? now,
            updatedAt: now,
          },
        ],
      }));
      const status = await sendInvitation("send", practice, parent, eventId);
      updateData((current) => ({
        ...current,
        assignments: current.assignments.map((item) =>
          item.practiceId === practice.id
            ? { ...item, calendarInviteStatus: status, updatedAt: new Date().toISOString() }
            : item,
        ),
      }));
      setSelectedPractice(null);
      notify(`Assignment saved. Calendar file created for ${parent.name}.`);
    } catch (error) {
      updateData((current) => ({
        ...current,
        assignments: current.assignments.map((item) =>
          item.practiceId === practice.id ? { ...item, calendarInviteStatus: "failed" } : item,
        ),
      }));
      notify(error instanceof Error ? error.message : "Assignment saved, but the invitation failed.");
    } finally {
      setBusy(false);
    }
  }

  async function removeAssignment(practice: Practice) {
    const assignment = appData.assignments.find((item) => item.practiceId === practice.id);
    const parent = appData.parents.find((item) => item.id === assignment?.parentId);
    if (!assignment || !parent) return;
    setBusy(true);
    try {
      await sendInvitation("cancel", practice, parent, assignment.calendarEventId);
      updateData((current) => ({
        ...current,
        assignments: current.assignments.filter((item) => item.id !== assignment.id),
      }));
      setSelectedPractice(null);
      notify(`Assignment removed and ${parent.name}'s invitation cancelled.`);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not cancel the invitation.");
    } finally {
      setBusy(false);
    }
  }

  async function togglePracticeCancelled(practice: Practice) {
    if (practice.cancelledAt) {
      updateData((current) => ({
        ...current,
        practices: current.practices.map((item) =>
          item.id === practice.id ? { ...item, cancelledAt: undefined } : item,
        ),
      }));
      setSelectedPractice(null);
      notify("Practice restored. A driver can now be assigned.");
      return;
    }

    const assignment = appData.assignments.find((item) => item.practiceId === practice.id);
    const parent = appData.parents.find((item) => item.id === assignment?.parentId);
    setBusy(true);
    try {
      if (assignment && parent) {
        await sendInvitation("cancel", practice, parent, assignment.calendarEventId);
      }
      updateData((current) => ({
        ...current,
        practices: current.practices.map((item) =>
          item.id === practice.id ? { ...item, cancelledAt: new Date().toISOString() } : item,
        ),
        assignments: current.assignments.filter((item) => item.practiceId !== practice.id),
      }));
      setSelectedPractice(null);
      notify(parent ? `Practice cancelled. ${parent.name}'s invitation was cancelled.` : "Practice cancelled.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not cancel the practice.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div dir={rtl ? "rtl" : "ltr"} className="min-h-screen pb-24 md:pb-0">
      <header className="border-b border-[#dfe7e1] bg-[#f6f5ef]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-[#1f6a46] text-white">
              <BallIcon className="size-6" />
            </span>
            <div>
              <h1 className="text-lg font-black leading-tight sm:text-xl">Football Carpool</h1>
              <p className="text-xs text-[#65736b]">Asia/Jerusalem · Sunday first</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const next = !rtl;
                setRtl(next);
                saveRtl(next);
              }}
              className="grid h-11 place-items-center rounded-xl bg-white px-3 text-xs font-black shadow-sm"
              aria-label="Toggle right-to-left layout"
            >
              {rtl ? "LTR" : "RTL"}
            </button>
            <button
              type="button"
              onClick={() => {
                saveSession(null);
                setSessionEmail(null);
              }}
              className="flex h-11 items-center gap-2 rounded-xl bg-white px-2 shadow-sm sm:px-3"
            >
              <span className="grid size-7 place-items-center rounded-full bg-[#dff36b] text-xs font-black">{currentParent.name[0]}</span>
              <span className="hidden text-sm font-bold sm:block">{currentParent.name}</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-6 sm:px-6 md:grid-cols-[190px_1fr] md:py-8">
        <aside className="hidden md:block">
          <nav className="sticky top-6 grid gap-1">
            {tabs.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  className={`flex min-h-12 items-center gap-3 rounded-xl px-3 font-bold transition ${
                    tab === item.id ? "bg-[#174f37] text-white shadow-md" : "text-[#58675e] hover:bg-white"
                  }`}
                >
                  <Icon className="size-5" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0">
          {tab === "calendar" && (
            <div className="grid gap-5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-[#1f6a46]">Hello, {currentParent.name}</p>
                  <h2 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">Who&apos;s driving?</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setTab("practices")}
                  className="flex min-h-12 shrink-0 items-center gap-2 rounded-xl bg-[#1f6a46] px-4 font-bold text-white hover:bg-[#164d35]"
                >
                  <PlusIcon className="size-5" />
                  <span className="hidden sm:inline">Add practice</span>
                </button>
              </div>
              <Dashboard parents={appData.parents} practices={appData.practices} assignments={appData.assignments} onPracticeClick={setSelectedPractice} />
              <MonthCalendar month={month} practices={appData.practices} parents={appData.parents} assignments={appData.assignments} rtl={rtl} onMonthChange={setMonth} onPracticeClick={setSelectedPractice} />
            </div>
          )}
          {tab === "practices" && (
            <PracticesManager
              practices={appData.practices}
              kids={appData.children}
              onSave={(practices, editingId) => updateData((current) => ({
                ...current,
                practices: editingId
                  ? [...current.practices.filter((item) => item.id !== editingId), ...practices]
                  : [...current.practices, ...practices],
              }))}
              onDelete={(practice) => updateData((current) => ({
                ...current,
                practices: current.practices.filter((item) => item.id !== practice.id),
                assignments: current.assignments.filter((item) => item.practiceId !== practice.id),
              }))}
              onToggleCancelled={togglePracticeCancelled}
            />
          )}
          {tab === "parents" && (
            <ParentsManager
              parents={appData.parents}
              assignedParentIds={new Set(appData.assignments.map((assignment) => assignment.parentId))}
              onSave={(parent) => updateData((current) => ({
                ...current,
                parents: current.parents.some((item) => item.id === parent.id)
                  ? current.parents.map((item) => item.id === parent.id ? parent : item)
                  : [...current.parents, parent],
              }))}
              onDelete={(parent) => updateData((current) => ({
                ...current,
                parents: current.parents.filter((item) => item.id !== parent.id),
              }))}
            />
          )}
          {tab === "children" && (
            <ChildrenManager
              kids={appData.children}
              onSave={(child: Child) => updateData((current) => ({
                ...current,
                children: current.children.some((item) => item.id === child.id)
                  ? current.children.map((item) => item.id === child.id ? child : item)
                  : [...current.children, child],
              }))}
              onDelete={(child) => updateData((current) => ({
                ...current,
                children: current.children.filter((item) => item.id !== child.id),
                practices: current.practices.map((practice) => ({
                  ...practice,
                  childIds: practice.childIds.filter((id) => id !== child.id),
                })),
              }))}
            />
          )}
        </main>
      </div>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-[#dfe7e1] bg-white/95 px-2 pt-2 backdrop-blur md:hidden">
        {tabs.map((item) => {
          const Icon = item.icon;
          return (
            <button type="button" key={item.id} onClick={() => setTab(item.id)} className={`grid min-h-14 place-items-center content-center gap-1 rounded-xl text-[10px] font-bold ${tab === item.id ? "text-[#1f6a46]" : "text-[#748178]"}`}>
              <Icon className={`size-5 ${tab === item.id ? "stroke-[2.4]" : ""}`} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {selectedPractice && (
        <AssignmentModal
          key={`${selectedPractice.id}-${appData.assignments.find((item) => item.practiceId === selectedPractice.id)?.parentId ?? "none"}`}
          practice={selectedPractice}
          parents={appData.parents}
          kids={appData.children}
          assignments={appData.assignments}
          rtl={rtl}
          busy={busy}
          onClose={() => setSelectedPractice(null)}
          onSave={assignParent}
          onRemove={removeAssignment}
          onToggleCancelled={togglePracticeCancelled}
        />
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 z-[60] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-xl bg-[#17231d] px-4 py-3 text-center text-sm font-bold text-white shadow-xl md:bottom-6">
          {toast}
        </div>
      )}
    </div>
  );
}
