import { createClient } from "npm:@supabase/supabase-js@999.9.2-canary.0";

type InviteAction = "send" | "cancel";

interface InvitationRequest {
  action: InviteAction;
  eventId: string;
  parent: {
    name: string;
    email: string;
  };
  practice: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    location: string;
    notes: string;
  };
  children: Array<{ name: string }>;
}

const allowedOrigins = new Set([
  "https://gilumagali.github.io",
  "http://localhost:3000",
  "http://localhost:4173",
]);

function corsHeaders(origin: string | null): Record<string, string> {
  return {
    "Access-Control-Allow-Origin":
      origin && allowedOrigins.has(origin)
        ? origin
        : "https://gilumagali.github.io",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

function json(
  body: Record<string, unknown>,
  status: number,
  origin: string | null,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
  });
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

function createIcs(input: InvitationRequest): string {
  const { action, eventId, parent, practice, children } = input;
  const description = [
    "You are assigned to drive the children to football practice.",
    `Practice time: ${practice.startTime}-${practice.endTime}`,
    `Location: ${practice.location}`,
    practice.notes ? `Notes: ${practice.notes}` : "",
    children.length
      ? `Children: ${children.map((child) => child.name).join(", ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Football Carpool//EN",
    "CALSCALE:GREGORIAN",
    `METHOD:${action === "cancel" ? "CANCEL" : "REQUEST"}`,
    "BEGIN:VEVENT",
    `UID:${escapeIcs(eventId)}`,
    `DTSTAMP:${new Date().toISOString().replaceAll(/[-:]/g, "").replace(/\.\d{3}/, "")}`,
    `DTSTART;TZID=Asia/Jerusalem:${compactDate(practice.date, practice.startTime)}`,
    `DTEND;TZID=Asia/Jerusalem:${compactDate(practice.date, practice.endTime)}`,
    "SUMMARY:Football Carpool – Driver",
    `DESCRIPTION:${escapeIcs(description)}`,
    `LOCATION:${escapeIcs(practice.location)}`,
    `ATTENDEE;CN=${escapeIcs(parent.name)};RSVP=TRUE:mailto:${parent.email}`,
    `STATUS:${action === "cancel" ? "CANCELLED" : "CONFIRMED"}`,
    "SEQUENCE:0",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

function toBase64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}

function isValidInput(value: unknown): value is InvitationRequest {
  if (!value || typeof value !== "object") return false;
  const input = value as Partial<InvitationRequest>;
  return Boolean(
    (input.action === "send" || input.action === "cancel") &&
      input.eventId &&
      input.parent?.name &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.parent.email ?? "") &&
      input.practice?.id &&
      /^\d{4}-\d{2}-\d{2}$/.test(input.practice.date ?? "") &&
      /^\d{2}:\d{2}$/.test(input.practice.startTime ?? "") &&
      /^\d{2}:\d{2}$/.test(input.practice.endTime ?? "") &&
      input.practice.location &&
      Array.isArray(input.children),
  );
}

Deno.serve(async (request) => {
  const origin = request.headers.get("Origin");
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }
  if (request.method !== "POST") {
    return json({ ok: false, error: "Method not allowed." }, 405, origin);
  }

  const authorization = request.headers.get("Authorization");
  if (!authorization) {
    return json({ ok: false, error: "Authentication is required." }, 401, origin);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const publishableKey =
    Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SB_PUBLISHABLE_KEY");
  const secretKey =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SB_SECRET_KEY");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail = Deno.env.get("CALENDAR_FROM_EMAIL");
  if (
    !supabaseUrl ||
    !publishableKey ||
    !secretKey ||
    !resendApiKey ||
    !fromEmail
  ) {
    return json(
      { ok: false, error: "Email service is not configured." },
      503,
      origin,
    );
  }

  const userClient = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authorization } },
  });
  const adminClient = createClient(supabaseUrl, secretKey);
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();
  if (userError || !user?.email) {
    return json({ ok: false, error: "Invalid sign-in session." }, 401, origin);
  }

  const { data: caller, error: callerError } = await adminClient
    .from("parents")
    .select("id")
    .eq("email", user.email.toLowerCase())
    .eq("active", true)
    .maybeSingle();
  if (callerError) {
    console.error("Parent authorization failed:", callerError.message);
    return json({ ok: false, error: "Could not verify parent access." }, 500, origin);
  }
  if (!caller) {
    return json(
      { ok: false, error: "Only active parents can send invitations." },
      403,
      origin,
    );
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error: countError } = await adminClient
    .from("email_notifications")
    .select("id", { count: "exact", head: true })
    .eq("requested_by", user.id)
    .gte("created_at", oneHourAgo);
  if (countError) {
    console.error("Rate limit check failed:", countError.message);
    return json({ ok: false, error: "Could not verify email limits." }, 500, origin);
  }
  if ((count ?? 0) >= 20) {
    return json(
      { ok: false, error: "Email limit reached. Try again later." },
      429,
      origin,
    );
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return json({ ok: false, error: "Invalid request body." }, 400, origin);
  }
  if (!isValidInput(input)) {
    return json(
      { ok: false, error: "Missing or invalid invitation details." },
      400,
      origin,
    );
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [input.parent.email],
      subject:
        input.action === "cancel"
          ? `Cancelled: Football practice on ${input.practice.date}`
          : `Driver assignment: Football practice on ${input.practice.date}`,
      text:
        input.action === "cancel"
          ? "Your Football Carpool driving assignment has been cancelled."
          : `You are assigned to drive to football practice on ${input.practice.date} from ${input.practice.startTime} to ${input.practice.endTime} at ${input.practice.location}.`,
      attachments: [
        {
          filename: `football-carpool-${input.practice.date}.ics`,
          content: toBase64(createIcs(input)),
        },
      ],
    }),
  });

  if (!response.ok) {
    console.error("Resend failed:", response.status, await response.text());
    return json(
      { ok: false, error: "The invitation email could not be sent." },
      502,
      origin,
    );
  }

  const { error: logError } = await adminClient.from("email_notifications").insert({
    requested_by: user.id,
    recipient_email: input.parent.email.toLowerCase(),
    practice_id: input.practice.id,
    event_id: input.eventId,
    action: input.action,
    status: "sent",
  });
  if (logError) {
    console.error("Email audit log failed:", logError.message);
  }

  return json(
    {
      ok: true,
      status: input.action === "cancel" ? "cancelled" : "sent",
    },
    200,
    origin,
  );
});
