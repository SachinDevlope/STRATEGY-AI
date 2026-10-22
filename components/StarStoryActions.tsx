"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteStarStoryAction } from "@/app/dashboard/star/actions";

const OUTLINE_BUTTON =
  "border border-outline-variant text-on-surface-variant px-4 py-2 rounded font-label-caps text-label-caps uppercase hover:border-primary-container hover:text-primary-container transition-colors flex items-center gap-2 disabled:opacity-60";

export function CopyAnswerButton({ text }: { text: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      // Missing on insecure origins and some older browsers.
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("failed");
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button type="button" onClick={copy} className={OUTLINE_BUTTON}>
        <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
          {state === "copied" ? "check" : "content_copy"}
        </span>
        {state === "copied" ? "Copied" : "Copy"}
      </button>
      <span role="status" className="text-body-sm text-on-surface-variant">
        {state === "failed" && "Copy failed — select the text and copy it manually."}
      </span>
    </div>
  );
}

export function DeleteStoryButton({ storyId }: { storyId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    if (!window.confirm("Delete this story? This cannot be undone.")) return;
    setBusy(true);
    setError(null);
    try {
      const result = await deleteStarStoryAction(storyId);
      if (!result.ok) {
        setError(result.error);
        setBusy(false);
        return;
      }
      router.push("/dashboard/star");
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={remove}
        disabled={busy}
        className={`${OUTLINE_BUTTON} hover:!border-error hover:!text-error`}
      >
        <span aria-hidden="true" className="material-symbols-outlined text-[18px]">delete</span>
        {busy ? "Deleting…" : "Delete"}
      </button>
      {error && (
        <p role="alert" className="text-body-sm text-error">
          {error}
        </p>
      )}
    </div>
  );
}
