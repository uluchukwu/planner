"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { ImportClient } from "@/components/import/ImportClient";
import { AdjustClient } from "@/components/import/AdjustClient";

type Mode = "import" | "adjust";

export function ImportModeSwitcher() {
  const [mode, setMode] = useState<Mode>("import");

  return (
    <div className="flex flex-col gap-5">
      <div className="inline-flex rounded-lg border border-hairline bg-surface p-1 self-start">
        <button
          type="button"
          onClick={() => setMode("import")}
          className={clsx(
            "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
            mode === "import" ? "bg-accent text-white" : "text-ink-soft hover:text-ink"
          )}
        >
          Import new plan
        </button>
        <button
          type="button"
          onClick={() => setMode("adjust")}
          className={clsx(
            "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
            mode === "adjust" ? "bg-accent text-white" : "text-ink-soft hover:text-ink"
          )}
        >
          Adjust existing plan
        </button>
      </div>
      {mode === "import" ? <ImportClient /> : <AdjustClient />}
    </div>
  );
}
