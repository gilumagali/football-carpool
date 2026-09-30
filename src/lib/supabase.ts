import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient | null | undefined;

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabasePublishableKey);
}

export function getSupabaseClient(): SupabaseClient | null {
  if (client !== undefined) return client;
  client =
    supabaseUrl && supabasePublishableKey
      ? createClient(supabaseUrl, supabasePublishableKey, {
          auth: {
            persistSession: true,
            detectSessionInUrl: true,
            autoRefreshToken: true,
          },
        })
      : null;
  return client;
}

export async function sendDriverEmail(input: unknown): Promise<{
  ok: boolean;
  status?: "sent" | "cancelled";
  error?: string;
}> {
  const supabase = getSupabaseClient();
  if (!supabase || !supabaseUrl || !supabasePublishableKey) {
    return { ok: false, error: "Email service is not configured." };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return { ok: false, error: "Sign in through the email link before sending invitations." };
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/send-driver-invitation`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: supabasePublishableKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  const result = (await response.json()) as {
    ok?: boolean;
    status?: "sent" | "cancelled";
    error?: string;
  };
  return {
    ok: response.ok && result.ok === true,
    status: result.status,
    error: result.error,
  };
}
