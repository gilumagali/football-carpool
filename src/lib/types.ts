export type InviteStatus =
  | "not_sent"
  | "sending"
  | "sent"
  | "generated"
  | "cancelled"
  | "failed";

export interface Parent {
  id: string;
  name: string;
  email: string;
  phone?: string;
  capacity?: number;
  active: boolean;
  createdAt: string;
}

export interface Child {
  id: string;
  name: string;
  family: string;
  active: boolean;
}

export interface Practice {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  notes: string;
  childIds: string[];
  recurrenceGroupId?: string;
  cancelledAt?: string;
  createdAt: string;
}

export interface Assignment {
  id: string;
  practiceId: string;
  parentId: string;
  calendarEventId: string;
  calendarInviteStatus: InviteStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CarpoolData {
  parents: Parent[];
  children: Child[];
  practices: Practice[];
  assignments: Assignment[];
}

export type AppTab = "calendar" | "practices" | "parents" | "children";
