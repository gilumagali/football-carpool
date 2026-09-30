"use client";

import { AssignmentModal } from "@/components/assignment-modal";
import { ChildrenManager } from "@/components/children-manager";
import { DataTransferModal } from "@/components/data-transfer-modal";
import { Dashboard } from "@/components/dashboard";
import { BallIcon, CalendarIcon, ChildIcon, DataIcon, PlusIcon, UsersIcon } from "@/components/icons";
import { Login } from "@/components/login";
import { MonthCalendar } from "@/components/month-calendar";
import { ParentsManager } from "@/components/parents-manager";
import { PracticesManager } from "@/components/practices-manager";
import { startOfMonth } from "@/lib/date";
import { downloadCalendarInvitation } from "@/lib/calendar-invitation";
import {
  loadCloudData,
  normalizeParentIds,
  replaceCloudData,
  shouldMigrateLocalData,
  subscribeToCloudData,
} from "@/lib/cloud-store";
import { loadData, loadRtl, loadSession, saveData, saveRtl, saveSession } from "@/lib/store";
import {
  getSupabaseClient,
  isSupabaseConfigured,
  sendDriverEmail,
} from "@/lib/supabase";
import type { AppTab, CarpoolData, Child, Parent, Practice } from "@/lib/types";
import { useEffect, useMemo, useRef, useState } from "react";

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
  const [dataTransferOpen, setDataTransferOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [cloudLoading, setCloudLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"local" | "syncing" | "synced" | "error">(
    isSupabaseConfigured() ? "syncing" : "local",
  );
  const dataRef = useRef<CarpoolData | null>(null);
  const writeQueueRef = useRef(Promise.resolve());
  const pendingWritesRef = useRef(0);
  const refreshQueuedRef = useRef(false);
  const refreshCloudRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    const supabase = getSupabaseClient();
    const localData = loadData();
    dataRef.current = localData;
    queueMicrotask(async () => {
      setData(localData);
      setRtl(loadRtl());
      if (supabase) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setSessionEmail(session?.user.email ?? null);
      } else {
        setSessionEmail(loadSession());
      }
      setReady(true);
    });
    if (!supabase) return;
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionEmail(session?.user.email ?? null);
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase || !sessionEmail) {
      refreshCloudRef.current = async () => {};
      queueMicrotask(() => setSyncStatus(isSupabaseConfigured() ? "syncing" : "local"));
      return;
    }
    const client = supabase;

    let active = true;
    let unsubscribe = () => {};
    let refreshTimer: number | undefined;

    async function applyCloudData() {
      if (pendingWritesRef.current > 0) {
        refreshQueuedRef.current = true;
        return;
      }
      try {
        const cloudData = await loadCloudData(client);
        if (!active) return;
        dataRef.current = cloudData;
        setData(cloudData);
        saveData(cloudData);
        setSyncStatus("synced");
      } catch (error) {
        if (!active) return;
        setSyncStatus("error");
        notify(error instanceof Error ? error.message : "Could not load shared carpool data.");
      }
    }

    function scheduleRefresh() {
      if (pendingWritesRef.current > 0) {
        refreshQueuedRef.current = true;
        return;
      }
      if (refreshTimer) window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => void applyCloudData(), 250);
    }

    refreshCloudRef.current = applyCloudData;
    void (async () => {
      setCloudLoading(true);
      setSyncStatus("syncing");
      try {
        const cloudData = await loadCloudData(client);
        if (!active) return;
        const localData = dataRef.current;
        let nextData = cloudData;
        if (localData && shouldMigrateLocalData(localData, cloudData)) {
          nextData = normalizeParentIds(localData, cloudData);
          await replaceCloudData(client, nextData);
          if (!active) return;
          notify("Your data was moved to shared cloud storage.");
        }
        dataRef.current = nextData;
        setData(nextData);
        saveData(nextData);
        setSyncStatus("synced");
        unsubscribe = subscribeToCloudData(client, scheduleRefresh);
      } catch (error) {
        if (!active) return;
        setSyncStatus("error");
        notify(error instanceof Error ? error.message : "Could not connect to shared storage.");
      } finally {
        if (active) setCloudLoading(false);
      }
    })();

    function refreshWhenVisible() {
      if (document.visibilityState === "visible") scheduleRefresh();
    }
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      active = false;
      if (refreshTimer) window.clearTimeout(refreshTimer);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      unsubscribe();
      refreshCloudRef.current = async () => {};
    };
  }, [sessionEmail]);

  function applyData(next: CarpoolData) {
    dataRef.current = next;
    setData(next);
    saveData(next);
  }

  function updateData(updater: (current: CarpoolData) => CarpoolData) {
    const current = dataRef.current;
    if (!current) return;
    const next = updater(current);
    applyData(next);

    const supabase = getSupabaseClient();
    if (!supabase || !sessionEmail) return;
    pendingWritesRef.current += 1;
    setSyncStatus("syncing");
    writeQueueRef.current = writeQueueRef.current.then(async () => {
      try {
        await replaceCloudData(supabase, next);
      } catch (error) {
        setSyncStatus("error");
        notify(error instanceof Error ? error.message : "Could not save shared data.");
      } finally {
        pendingWritesRef.current -= 1;
        if (pendingWritesRef.current === 0) {
          if (refreshQueuedRef.current) {
            refreshQueuedRef.current = false;
            await refreshCloudRef.current();
          } else {
            setSyncStatus("synced");
          }
        }
      }
    });
  }

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 3500);
  }

  const currentParent = useMemo(
    () => data?.parents.find(
      (parent) => parent.email.toLowerCase() === sessionEmail?.toLowerCase(),
    ),
    [data?.parents, sessionEmail],
  );

  if (!ready || !data || cloudLoading) {
    return <div className="grid min-h-screen place-items-center font-bold text-[#1f6a46]">Loading carpool…</div>;
  }

  if (!currentParent) {
    return (
      <Login
        parents={data.parents}
        onLogin={async (email) => {
          const supabase = getSupabaseClient();
          if (supabase) {
            const { error } = await supabase.auth.signInWithOtp({
              email,
              options: { emailRedirectTo: window.location.href },
            });
            return error
              ? { ok: false, error: error.message }
              : { ok: true, pendingEmail: true };
          }
          const parent = data.parents.find((item) => item.active && item.email.toLowerCase() === email);
          if (!parent) return { ok: false };
          setSessionEmail(parent.email);
          saveSession(parent.email);
          return { ok: true };
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
    const input = {
      action,
      eventId,
      parent,
      practice,
      children: appData.children.filter((child) => practice.childIds.includes(child.id)),
    };
    if (isSupabaseConfigured()) {
      const result = await sendDriverEmail(input);
      if (!result.ok || !result.status) {
        if (action === "send") downloadCalendarInvitation(input);
        throw new Error(
          result.error
            ? `${result.error} Calendar file downloaded as a fallback.`
            : "Email failed. Calendar file downloaded as a fallback.",
        );
      }
      return result.status;
    }
    downloadCalendarInvitation(input);
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
      notify(
        status === "sent"
          ? `Invitation emailed to ${parent.name}.`
          : `Assignment saved. Calendar file created for ${parent.name}.`,
      );
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
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-3 sm:gap-4 sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#1f6a46] text-white sm:size-11 sm:rounded-2xl">
              <BallIcon className="size-5 sm:size-6" />
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-base font-black leading-tight sm:text-xl">Football Carpool</h1>
              <p className="hidden items-center gap-1.5 text-xs text-[#65736b] sm:flex">
                <span
                  className={`size-2 rounded-full ${
                    syncStatus === "synced"
                      ? "bg-[#4f9f70]"
                      : syncStatus === "error"
                        ? "bg-[#d06c4d]"
                        : syncStatus === "syncing"
                          ? "animate-pulse bg-[#d4a441]"
                          : "bg-[#98a39c]"
                  }`}
                />
                {syncStatus === "synced"
                  ? "Shared across devices"
                  : syncStatus === "syncing"
                    ? "Syncing changes"
                    : syncStatus === "error"
                      ? "Cloud connection problem"
                      : "Saved on this device"}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => setDataTransferOpen(true)}
              className="grid size-10 place-items-center rounded-xl bg-white shadow-sm sm:size-11"
              aria-label="Back up or import data"
            >
              <DataIcon className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => {
                const next = !rtl;
                setRtl(next);
                saveRtl(next);
              }}
              className="grid h-10 place-items-center rounded-xl bg-white px-2 text-[11px] font-black shadow-sm sm:h-11 sm:px-3 sm:text-xs"
              aria-label="Toggle right-to-left layout"
            >
              {rtl ? "LTR" : "RTL"}
            </button>
            <button
              type="button"
              onClick={() => {
                void getSupabaseClient()?.auth.signOut();
                saveSession(null);
                setSessionEmail(null);
              }}
              className="flex h-10 items-center gap-2 rounded-xl bg-white px-1.5 shadow-sm sm:h-11 sm:px-3"
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

      <DataTransferModal
        open={dataTransferOpen}
        data={appData}
        shared={isSupabaseConfigured()}
        onClose={() => setDataTransferOpen(false)}
        onImport={(imported) => {
          const normalized = normalizeParentIds(imported, appData);
          updateData(() => normalized);
          notify(
            isSupabaseConfigured()
              ? "Backup imported and shared with the group."
              : "Backup imported successfully.",
          );
        }}
      />

      {toast && (
        <div className="fixed bottom-24 left-1/2 z-[60] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-xl bg-[#17231d] px-4 py-3 text-center text-sm font-bold text-white shadow-xl md:bottom-6">
          {toast}
        </div>
      )}
    </div>
  );
}
