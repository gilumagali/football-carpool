"use client";

import { DataIcon, DownloadIcon, UploadIcon } from "@/components/icons";
import { Modal } from "@/components/ui";
import type { CarpoolData } from "@/lib/types";
import { useRef, useState } from "react";

interface BackupFile {
  app: "football-carpool";
  version: 1;
  exportedAt: string;
  data: CarpoolData;
}

function isCarpoolData(value: unknown): value is CarpoolData {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<CarpoolData>;
  return (
    Array.isArray(data.parents) &&
    Array.isArray(data.children) &&
    Array.isArray(data.practices) &&
    Array.isArray(data.assignments)
  );
}

export function DataTransferModal({
  open,
  data,
  onClose,
  onImport,
}: {
  open: boolean;
  data: CarpoolData;
  onClose: () => void;
  onImport: (data: CarpoolData) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");

  function downloadFile(file: File) {
    const url = URL.createObjectURL(file);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = file.name;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function exportData() {
    const backup: BackupFile = {
      app: "football-carpool",
      version: 1,
      exportedAt: new Date().toISOString(),
      data,
    };
    const file = new File(
      [JSON.stringify(backup, null, 2)],
      `football-carpool-backup-${new Date().toISOString().slice(0, 10)}.json`,
      { type: "application/json" },
    );

    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          title: "Football Carpool backup",
          text: "Private backup of the Football Carpool schedule.",
          files: [file],
        });
        return;
      } catch (shareError) {
        if (shareError instanceof DOMException && shareError.name === "AbortError") return;
      }
    }
    downloadFile(file);
  }

  async function importData(file: File | undefined) {
    if (!file) return;
    setError("");
    try {
      const parsed = JSON.parse(await file.text()) as Partial<BackupFile>;
      const imported = parsed.app === "football-carpool" ? parsed.data : parsed;
      if (!isCarpoolData(imported)) throw new Error("Invalid backup structure.");
      onImport(imported);
      onClose();
    } catch {
      setError("This file is not a valid Football Carpool backup.");
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  return (
    <Modal open={open} title="Move or back up data" onClose={onClose}>
      <div className="grid gap-4">
        <div className="rounded-2xl bg-[#edf4ef] p-4 text-sm text-[#405248]">
          Your family and schedule data stays private on this device. Export a backup to move it
          to another phone or browser, then import it there.
        </div>

        <button
          type="button"
          onClick={() => void exportData()}
          className="flex min-h-16 items-center gap-4 rounded-2xl bg-[#174f37] px-5 text-start text-white"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/12">
            <DownloadIcon className="size-6" />
          </span>
          <span>
            <strong className="block">Export private backup</strong>
            <span className="text-sm text-white/70">Save or share one JSON file</span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="flex min-h-16 items-center gap-4 rounded-2xl border border-[#dce5de] bg-white px-5 text-start"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#edf4ef] text-[#1f6a46]">
            <UploadIcon className="size-6" />
          </span>
          <span>
            <strong className="block">Import existing backup</strong>
            <span className="text-sm text-[#65736b]">Replace this device&apos;s current data</span>
          </span>
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(event) => void importData(event.target.files?.[0])}
        />

        {error && (
          <p className="rounded-xl bg-[#fff0ea] px-4 py-3 text-sm font-semibold text-[#a64025]">
            {error}
          </p>
        )}

        <div className="flex items-center gap-2 text-xs text-[#748178]">
          <DataIcon className="size-4" />
          {data.parents.length} parents · {data.children.length} children ·{" "}
          {data.practices.length} practices
        </div>
      </div>
    </Modal>
  );
}
