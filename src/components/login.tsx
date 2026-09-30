"use client";

import { BallIcon, CarIcon } from "@/components/icons";
import { inputClass } from "@/components/ui";
import type { Parent } from "@/lib/types";
import { useState, type FormEvent } from "react";

export function Login({
  parents,
  onLogin,
}: {
  parents: Parent[];
  onLogin: (email: string) => Promise<{
    ok: boolean;
    pendingEmail?: boolean;
    error?: string;
  }>;
}) {
  const [email, setEmail] = useState(
    parents.find((parent) => parent.active)?.email ?? "",
  );
  const [error, setError] = useState("");
  const [pendingEmail, setPendingEmail] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    const result = await onLogin(email.trim().toLowerCase());
    setBusy(false);
    setPendingEmail(Boolean(result.pendingEmail));
    if (!result.ok) setError(result.error ?? "Use the email address of an active parent in this group.");
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <section className="w-full max-w-md overflow-hidden rounded-[32px] border border-white bg-white shadow-[0_24px_80px_rgba(25,68,45,.14)]">
        <div className="relative overflow-hidden bg-[#174f37] px-7 pb-10 pt-8 text-white">
          <div className="absolute -right-8 -top-9 size-36 rounded-full border-[24px] border-white/5" />
          <div className="mb-10 flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-2xl bg-[#dff36b] text-[#174f37]">
              <BallIcon className="size-7" />
            </span>
            <span className="text-xl font-bold">Football Carpool</span>
          </div>
          <h1 className="max-w-xs text-4xl font-black leading-[1.05] tracking-tight">
            Practice rides, sorted.
          </h1>
          <p className="mt-3 max-w-sm text-white/75">
            See the schedule, choose a driver, and keep every family in sync.
          </p>
        </div>
        <form onSubmit={submit} className="grid gap-5 p-7">
          <div>
            <h2 className="text-2xl font-bold">Welcome back</h2>
            <p className="mt-1 text-sm text-[#65736b]">Sign in with your parent email.</p>
          </div>
          <label className="grid gap-2 text-sm font-semibold">
            Email address
            <input
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError("");
              }}
              className={inputClass}
              autoComplete="email"
              required
            />
          </label>
          {error && (
            <p className="rounded-xl bg-[#fff0ea] px-3 py-2 text-sm font-medium text-[#a64025]">
              {error}
            </p>
          )}
          {pendingEmail && (
            <p className="rounded-xl bg-[#edf4ef] px-3 py-3 text-sm font-medium text-[#1f6a46]">
              Check your inbox and open the secure sign-in link. You can close this message after the app signs you in.
            </p>
          )}
          <button disabled={busy} className="flex h-13 items-center justify-center gap-2 rounded-xl bg-[#1f6a46] px-5 font-bold text-white transition hover:bg-[#164d35]">
            <CarIcon className="size-5" />
            {busy ? "Sending link…" : "Open carpool"}
          </button>
          <p className="text-center text-xs text-[#7a877f]">
            Active account: {parents.filter((parent) => parent.active).map((parent) => parent.email).join(" · ")}
          </p>
        </form>
      </section>
    </main>
  );
}
