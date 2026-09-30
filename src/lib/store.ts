import { createInitialData } from "@/lib/initial-data";
import type { CarpoolData } from "@/lib/types";

const DATA_KEY = "football-carpool-data-v2";
const SESSION_KEY = "football-carpool-session-v2";
const RTL_KEY = "football-carpool-rtl-v1";

export function loadData(): CarpoolData {
  const raw = window.localStorage.getItem(DATA_KEY);
  if (!raw) {
    const initialData = createInitialData();
    saveData(initialData);
    return initialData;
  }
  try {
    return JSON.parse(raw) as CarpoolData;
  } catch {
    const initialData = createInitialData();
    saveData(initialData);
    return initialData;
  }
}

export function saveData(data: CarpoolData): void {
  window.localStorage.setItem(DATA_KEY, JSON.stringify(data));
}

export function loadSession(): string | null {
  return window.localStorage.getItem(SESSION_KEY);
}

export function saveSession(email: string | null): void {
  if (email) window.localStorage.setItem(SESSION_KEY, email);
  else window.localStorage.removeItem(SESSION_KEY);
}

export function loadRtl(): boolean {
  return window.localStorage.getItem(RTL_KEY) === "true";
}

export function saveRtl(value: boolean): void {
  window.localStorage.setItem(RTL_KEY, String(value));
}
