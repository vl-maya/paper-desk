"use client";

import { useEffect } from "react";
import { hasPendingPersist, useWorkspaceStore } from "@/lib/store/workspace-store";

const POLL_MS = 15_000;

/** The user is mid-edit: focused text field / CodeMirror, or a modal is open. */
function userIsEditing(): boolean {
  if (typeof document === "undefined") return false;
  if (document.querySelector('[role="dialog"]')) return true;
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  if (el.isContentEditable) return true;
  if (el.closest(".cm-editor")) return true;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

/**
 * Keep an open tab in sync with writes made outside it (REST v1 API, MCP, other tabs).
 * Checks the cheap manifest endpoint on window focus / visibility and every 15s while
 * visible; only re-fetches the full workspace when `lastModified` differs, and never
 * while a local save is pending or the user is editing.
 */
export function useServerSync() {
  useEffect(() => {
    let stopped = false;
    let running = false;

    const check = async () => {
      if (stopped || running || document.visibilityState !== "visible") return;
      const { ioMode, snapshot, refreshFromServer } = useWorkspaceStore.getState();
      if (ioMode !== "server" || !snapshot) return;
      if (hasPendingPersist() || userIsEditing()) return;
      running = true;
      try {
        const res = await fetch("/api/v1/manifest", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { manifest: { lastModified: string } | null };
        const remote = data.manifest?.lastModified;
        const local = useWorkspaceStore.getState().snapshot?.manifest.lastModified;
        if (remote && remote !== local && !userIsEditing()) {
          await refreshFromServer();
        }
      } catch {
        /* offline: ignore */
      } finally {
        running = false;
      }
    };

    const onVisible = () => void check();
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(() => void check(), POLL_MS);
    return () => {
      stopped = true;
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
    };
  }, []);
}
