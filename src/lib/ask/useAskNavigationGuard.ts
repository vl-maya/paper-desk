"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  hasRunningAskEntries,
  reconcileRunningEntries,
} from "@/lib/ask/ask-query-runner";
import { selectAskRunnerBusy, useAskRunnerStore } from "@/lib/ask/ask-runner-store";

const LEAVE_MESSAGE =
  "An Ask desk query is still running. Leave this page? It will keep running in the background.";

export function useAskNavigationGuard() {
  const pathname = usePathname();
  const busy = useAskRunnerStore(selectAskRunnerBusy);

  useEffect(() => {
    void reconcileRunningEntries();
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void reconcileRunningEntries();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!hasRunningAskEntries()) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [busy, pathname]);

  return { confirmLeave: () => window.confirm(LEAVE_MESSAGE) };
}

export function shouldConfirmAskLeave(
  targetHref: string,
  currentPathname: string,
): boolean {
  if (!hasRunningAskEntries()) return false;
  const onAsk = currentPathname.startsWith("/ask");
  const targetOnAsk = targetHref.startsWith("/ask");
  return onAsk && !targetOnAsk;
}
