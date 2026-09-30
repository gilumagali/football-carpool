import type { SupabaseClient } from "@supabase/supabase-js";
import type { Assignment, CarpoolData, Child, Parent, Practice } from "@/lib/types";

interface ParentRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  capacity: number | null;
  active: boolean;
  created_at: string;
}

interface ChildRow {
  id: string;
  name: string;
  family_id: string;
  active: boolean;
}

interface PracticeRow {
  id: string;
  practice_date: string;
  start_time: string;
  end_time: string;
  location: string;
  notes: string;
  recurrence_group_id: string | null;
  cancelled_at: string | null;
  created_at: string;
}

interface PracticeChildRow {
  practice_id: string;
  child_id: string;
}

interface AssignmentRow {
  id: string;
  practice_id: string;
  parent_id: string;
  calendar_event_id: string;
  calendar_invite_status: Assignment["calendarInviteStatus"];
  created_at: string;
  updated_at: string;
}

function rows<T>(data: unknown, error: { message: string } | null, label: string): T[] {
  if (error) throw new Error(`Could not load ${label}: ${error.message}`);
  return (data ?? []) as T[];
}

export async function loadCloudData(supabase: SupabaseClient): Promise<CarpoolData> {
  const [parentsResult, childrenResult, practicesResult, practiceChildrenResult, assignmentsResult] =
    await Promise.all([
      supabase.from("parents").select("id,name,email,phone,capacity,active,created_at").order("created_at"),
      supabase.from("children").select("id,name,family_id,active").order("name"),
      supabase
        .from("practices")
        .select("id,practice_date,start_time,end_time,location,notes,recurrence_group_id,cancelled_at,created_at")
        .order("practice_date"),
      supabase.from("practice_children").select("practice_id,child_id"),
      supabase
        .from("assignments")
        .select("id,practice_id,parent_id,calendar_event_id,calendar_invite_status,created_at,updated_at"),
    ]);

  const parentRows = rows<ParentRow>(parentsResult.data, parentsResult.error, "parents");
  const childRows = rows<ChildRow>(childrenResult.data, childrenResult.error, "children");
  const practiceRows = rows<PracticeRow>(practicesResult.data, practicesResult.error, "practices");
  const practiceChildRows = rows<PracticeChildRow>(
    practiceChildrenResult.data,
    practiceChildrenResult.error,
    "practice children",
  );
  const assignmentRows = rows<AssignmentRow>(
    assignmentsResult.data,
    assignmentsResult.error,
    "assignments",
  );

  const childIdsByPractice = new Map<string, string[]>();
  for (const row of practiceChildRows) {
    childIdsByPractice.set(row.practice_id, [
      ...(childIdsByPractice.get(row.practice_id) ?? []),
      row.child_id,
    ]);
  }

  const parents: Parent[] = parentRows.map((parent) => ({
    id: parent.id,
    name: parent.name,
    email: parent.email,
    phone: parent.phone ?? undefined,
    capacity: parent.capacity ?? undefined,
    active: parent.active,
    createdAt: parent.created_at,
  }));
  const children: Child[] = childRows.map((child) => ({
    id: child.id,
    name: child.name,
    family: child.family_id,
    active: child.active,
  }));
  const practices: Practice[] = practiceRows.map((practice) => ({
    id: practice.id,
    date: practice.practice_date,
    startTime: practice.start_time.slice(0, 5),
    endTime: practice.end_time.slice(0, 5),
    location: practice.location,
    notes: practice.notes,
    childIds: childIdsByPractice.get(practice.id) ?? [],
    recurrenceGroupId: practice.recurrence_group_id ?? undefined,
    cancelledAt: practice.cancelled_at ?? undefined,
    createdAt: practice.created_at,
  }));
  const assignments: Assignment[] = assignmentRows.map((assignment) => ({
    id: assignment.id,
    practiceId: assignment.practice_id,
    parentId: assignment.parent_id,
    calendarEventId: assignment.calendar_event_id,
    calendarInviteStatus: assignment.calendar_invite_status,
    createdAt: assignment.created_at,
    updatedAt: assignment.updated_at,
  }));

  return { parents, children, practices, assignments };
}

function toCloudPayload(data: CarpoolData) {
  return {
    parents: data.parents.map((parent) => ({
      id: parent.id,
      name: parent.name,
      email: parent.email.toLowerCase(),
      phone: parent.phone ?? null,
      capacity: parent.capacity ?? null,
      active: parent.active,
      created_at: parent.createdAt,
    })),
    children: data.children.map((child) => ({
      id: child.id,
      name: child.name,
      family_id: child.family,
      active: child.active,
      created_at: new Date().toISOString(),
    })),
    practices: data.practices.map((practice) => ({
      id: practice.id,
      practice_date: practice.date,
      start_time: practice.startTime,
      end_time: practice.endTime,
      location: practice.location,
      notes: practice.notes,
      recurrence_group_id: practice.recurrenceGroupId ?? null,
      cancelled_at: practice.cancelledAt ?? null,
      created_at: practice.createdAt,
      child_ids: practice.childIds,
    })),
    assignments: data.assignments.map((assignment) => ({
      id: assignment.id,
      practice_id: assignment.practiceId,
      parent_id: assignment.parentId,
      calendar_event_id: assignment.calendarEventId,
      calendar_invite_status: assignment.calendarInviteStatus,
      created_at: assignment.createdAt,
      updated_at: assignment.updatedAt,
    })),
  };
}

export async function replaceCloudData(
  supabase: SupabaseClient,
  data: CarpoolData,
): Promise<void> {
  const { error } = await supabase.rpc("replace_carpool_data", {
    payload: toCloudPayload(data),
  });
  if (error) throw new Error(`Could not save shared data: ${error.message}`);
}

export function normalizeParentIds(data: CarpoolData, cloud: CarpoolData): CarpoolData {
  const cloudByEmail = new Map(
    cloud.parents.map((parent) => [parent.email.toLowerCase(), parent]),
  );
  const parentIdMap = new Map<string, string>();
  const parents = data.parents.map((parent) => {
    const existing = cloudByEmail.get(parent.email.toLowerCase());
    if (!existing) return parent;
    parentIdMap.set(parent.id, existing.id);
    return { ...parent, id: existing.id, createdAt: existing.createdAt };
  });

  return {
    ...data,
    parents,
    assignments: data.assignments.map((assignment) => ({
      ...assignment,
      parentId: parentIdMap.get(assignment.parentId) ?? assignment.parentId,
    })),
  };
}

export function shouldMigrateLocalData(local: CarpoolData, cloud: CarpoolData): boolean {
  const cloudIsEmpty =
    cloud.parents.length <= 1 &&
    cloud.children.length === 0 &&
    cloud.practices.length === 0 &&
    cloud.assignments.length === 0;
  const localHasData =
    local.parents.length > 1 ||
    local.children.length > 0 ||
    local.practices.length > 0 ||
    local.assignments.length > 0 ||
    local.parents.some((parent) => parent.phone || parent.capacity);
  return cloudIsEmpty && localHasData;
}

export function subscribeToCloudData(
  supabase: SupabaseClient,
  onChange: () => void,
): () => void {
  const channel = supabase
    .channel("shared-carpool-data")
    .on("postgres_changes", { event: "*", schema: "public", table: "parents" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "children" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "practices" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "practice_children" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "assignments" }, onChange)
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
