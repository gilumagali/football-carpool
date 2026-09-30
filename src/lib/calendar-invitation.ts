import type { Child, Parent, Practice } from "@/lib/types";

export interface InvitationInput {
  action: "send" | "cancel";
  eventId: string;
  parent: Parent;
  practice: Practice;
  children: Child[];
}

function escapeIcs(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("\n", "\\n")
    .replaceAll(",", "\\,")
    .replaceAll(";", "\\;");
}

function compactDate(date: string, time: string): string {
  return `${date.replaceAll("-", "")}T${time.replace(":", "")}00`;
}

export function createCalendarInvitation(input: InvitationInput): string {
  const { action, eventId, parent, practice, children } = input;
  const description = [
    "You are assigned to drive the children to football practice.",
    `Practice time: ${practice.startTime}-${practice.endTime}`,
    `Location: ${practice.location}`,
    practice.notes ? `Notes: ${practice.notes}` : "",
    children.length ? `Children: ${children.map((child) => child.name).join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  const method = action === "cancel" ? "CANCEL" : "REQUEST";
  const status = action === "cancel" ? "CANCELLED" : "CONFIRMED";

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Football Carpool//EN",
    "CALSCALE:GREGORIAN",
    `METHOD:${method}`,
    "BEGIN:VTIMEZONE",
    "TZID:Asia/Jerusalem",
    "BEGIN:STANDARD",
    "DTSTART:19701025T020000",
    "TZOFFSETFROM:+0300",
    "TZOFFSETTO:+0200",
    "TZNAME:IST",
    "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU",
    "END:STANDARD",
    "BEGIN:DAYLIGHT",
    "DTSTART:19700327T020000",
    "TZOFFSETFROM:+0200",
    "TZOFFSETTO:+0300",
    "TZNAME:IDT",
    "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1FR",
    "END:DAYLIGHT",
    "END:VTIMEZONE",
    "BEGIN:VEVENT",
    `UID:${escapeIcs(eventId)}`,
    `DTSTAMP:${new Date().toISOString().replaceAll(/[-:]/g, "").replace(/\.\d{3}/, "")}`,
    `DTSTART;TZID=Asia/Jerusalem:${compactDate(practice.date, practice.startTime)}`,
    `DTEND;TZID=Asia/Jerusalem:${compactDate(practice.date, practice.endTime)}`,
    `SUMMARY:${escapeIcs("Football Carpool – Driver")}`,
    `DESCRIPTION:${escapeIcs(description)}`,
    `LOCATION:${escapeIcs(practice.location)}`,
    `ATTENDEE;CN=${escapeIcs(parent.name)};RSVP=TRUE:mailto:${parent.email}`,
    `STATUS:${status}`,
    "SEQUENCE:0",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

export function downloadCalendarInvitation(
  input: InvitationInput,
  includeCancellation = false,
): void {
  if (input.action === "cancel" && !includeCancellation) return;

  const ics = createCalendarInvitation(input);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `football-carpool-${input.practice.date}${
    input.action === "cancel" ? "-cancelled" : ""
  }.ics`;
  anchor.click();
  URL.revokeObjectURL(url);
}
