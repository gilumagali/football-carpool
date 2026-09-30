import type { CarpoolData } from "@/lib/types";

export function createInitialData(): CarpoolData {
  return {
    parents: [
      {
        id: crypto.randomUUID(),
        name: "Gil",
        email: "gmagali1989@gmail.com",
        active: true,
        createdAt: new Date().toISOString(),
      },
    ],
    children: [],
    practices: [],
    assignments: [],
  };
}
